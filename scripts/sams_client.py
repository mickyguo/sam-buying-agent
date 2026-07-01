"""山姆会员店 API 客户端（需配置抓包 headers）。"""

from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

API_BASE = "https://api-sams.walmartmobile.cn/api/v1/sams"

MINI_PROGRAM_GOODS_HINT = (
    "微信小程序的商品搜索/详情接口经微信 Protobuf 网关加密，无法直接用 JSON 调用。\n"
    "可选方案：\n"
    "  1. 小程序内打开商品详情，在 Charles 复制 Response JSON，用 parse 命令导入\n"
    "  2. 用 replay 命令重放 Charles 里完整的抓包请求\n"
    "  3. 改用山姆 App 抓包（device-type: ios），配置 device_id 后使用 search/fetch"
)

IMAGE_KEYS = (
    "imageUrl",
    "image",
    "mainImage",
    "picUrl",
    "masterImage",
    "primaryImage",
    "imgUrl",
    "thumbnail",
    "coverImage",
    "defaultImage",
    "goodsImage",
    "spuImage",
    "thumbnailImage",
)

NAME_KEYS = ("title", "name", "goodsName", "productName", "spuName", "spuTitle")

PRICE_KEYS = (
    "price",
    "salePrice",
    "currentPrice",
    "minPrice",
    "retailPrice",
    "goodsPrice",
    "sellPrice",
)


@dataclass
class SamsProduct:
    external_id: str
    name: str
    image_url: str
    price_cents: int
    description: str | None = None
    source_url: str | None = None

    def to_project_payload(self, *, splittable: bool = False) -> dict[str, Any]:
        return {
            "name": self.name,
            "imageUrl": self.image_url,
            "price": self.price_cents,
            "splittable": splittable,
            "description": self.description or "价格以山姆门店为准，入库前请核对。",
            "sourceUrl": self.source_url or f"sams://product/{self.external_id}",
            "externalId": self.external_id,
        }

    def to_proxy_api_payload(self) -> dict[str, Any]:
        """供 SAMS_PRODUCT_API_URL 本地代理使用的 JSON 结构。"""
        return {
            "title": self.name,
            "name": self.name,
            "imageUrl": self.image_url,
            "price": round(self.price_cents / 100, 2),
            "description": self.description,
            "externalId": self.external_id,
        }


def _first_str(data: dict[str, Any], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    images = data.get("images")
    if isinstance(images, list) and images:
        first = images[0]
        if isinstance(first, str) and first.strip():
            return first.strip()
        if isinstance(first, dict):
            for key in IMAGE_KEYS:
                nested = first.get(key)
                if isinstance(nested, str) and nested.strip():
                    return nested.strip()
    return None


def _parse_price_cents(value: Any) -> int | None:
    if isinstance(value, (int, float)) and value > 0:
        num = float(value)
        return int(num) if num >= 100 else int(round(num * 100))
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned:
            return None
        if "." in cleaned:
            yuan = float("".join(ch for ch in cleaned if ch.isdigit() or ch == "."))
            return int(round(yuan * 100)) if yuan > 0 else None
        digits = "".join(ch for ch in cleaned if ch.isdigit())
        if not digits:
            return None
        num = int(digits)
        return num if num >= 100 else num * 100
    return None


def _price_from_price_info(raw: dict[str, Any]) -> int | None:
    price_info = raw.get("priceInfo")
    if not isinstance(price_info, list):
        return None
    for item in price_info:
        if not isinstance(item, dict):
            continue
        if item.get("priceType") == 1:
            cents = _parse_price_cents(item.get("price"))
            if cents:
                return cents
    for item in price_info:
        if isinstance(item, dict):
            cents = _parse_price_cents(item.get("price"))
            if cents:
                return cents
    return None


def _first_price(data: dict[str, Any]) -> int | None:
    from_info = _price_from_price_info(data)
    if from_info:
        return from_info
    for key in PRICE_KEYS:
        cents = _parse_price_cents(data.get(key))
        if cents:
            return cents
    return None


def parse_product_record(raw: dict[str, Any]) -> SamsProduct | None:
    external_id = str(
        raw.get("spuId")
        or raw.get("skuId")
        or raw.get("goodsId")
        or raw.get("spu_id")
        or raw.get("goods_id")
        or raw.get("id")
        or ""
    ).strip()
    name = _first_str(raw, NAME_KEYS)
    image_url = _first_str(raw, IMAGE_KEYS)
    price_cents = _first_price(raw)

    if not external_id or not name or not image_url or not price_cents:
        return None

    description = _first_str(raw, ("description", "subTitle", "brief", "goodsDesc", "sub_title"))
    return SamsProduct(
        external_id=external_id,
        name=name,
        image_url=image_url,
        price_cents=price_cents,
        description=description,
        source_url=f"sams://product/{external_id}",
    )


def _walk_product_nodes(node: Any, found: list[dict[str, Any]]) -> None:
    if isinstance(node, dict):
        keys = set(node.keys())
        id_keys = {"spuId", "skuId", "goodsId", "spu_id", "goods_id"}
        has_id = bool(keys & id_keys)
        has_name = bool(keys & set(NAME_KEYS))
        has_image = bool(keys & set(IMAGE_KEYS)) or "images" in keys
        if has_id and (has_name or has_image):
            found.append(node)
        for value in node.values():
            _walk_product_nodes(value, found)
    elif isinstance(node, list):
        for item in node:
            _walk_product_nodes(item, found)


def extract_products_from_response(payload: Any) -> list[SamsProduct]:
    # 山姆 search 响应：data.dataList
    if isinstance(payload, dict):
        data = payload.get("data")
        if isinstance(data, dict) and isinstance(data.get("dataList"), list):
            products: list[SamsProduct] = []
            seen: set[str] = set()
            for item in data["dataList"]:
                if not isinstance(item, dict):
                    continue
                parsed = parse_product_record(item)
                if parsed and parsed.external_id not in seen:
                    seen.add(parsed.external_id)
                    products.append(parsed)
            if products:
                return products

    nodes: list[dict[str, Any]] = []
    _walk_product_nodes(payload, nodes)

    products: list[SamsProduct] = []
    seen: set[str] = set()
    for node in nodes:
        parsed = parse_product_record(node)
        if parsed and parsed.external_id not in seen:
            seen.add(parsed.external_id)
            products.append(parsed)
    return products


HEADER_ALIASES = {
    "auth_token": "auth-token",
    "device_id": "device-id",
    "device_type": "device-type",
    "app_version": "app-version",
    "device_name": "device-name",
    "device_os_version": "device-os-version",
    "content_type": "content-type",
    "user_agent": "User-Agent",
}


def normalize_capture_headers(raw: dict[str, Any]) -> dict[str, str]:
    """将 capture.json 中下划线字段转为 HTTP 请求头格式。"""
    headers: dict[str, str] = {}
    for key, value in raw.items():
        if value is None or value == "":
            continue
        normalized = HEADER_ALIASES.get(key, key)
        lower = normalized.lower()
        if lower == "content-type":
            normalized = "Content-Type"
        elif lower == "user-agent":
            normalized = "User-Agent"
        elif lower == "host":
            normalized = "Host"
        headers[normalized] = str(value)
    return headers


class SamsClient:
    def __init__(self, config: dict[str, Any]):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update(self._build_headers())

    @classmethod
    def from_file(cls, path: str | Path) -> SamsClient:
        with open(path, encoding="utf-8") as f:
            return cls(json.load(f))

    def is_mini_program(self) -> bool:
        return self.config.get("device_type") == "mini_program"

    @staticmethod
    def _fresh_treq_id() -> str:
        return f"{uuid.uuid4().hex}.{int(time.time() * 1000)}0000"

    def _ensure_goods_api_supported(self) -> None:
        if self.is_mini_program():
            raise RuntimeError(MINI_PROGRAM_GOODS_HINT)

    def _build_headers(self) -> dict[str, str]:
        device_type = self.config.get("device_type", "ios")
        if device_type == "h5":
            return {
                "Content-Type": "application/json",
                "device-type": "h5",
                "pageChannelType": "wechat",
                "h5-key": "d41d8cd98f00b204e9800998ecf8427e",
                "User-Agent": (
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                    "Mobile/15E148 MicroMessenger/8.0.49"
                ),
                "auth-token": self.config.get("auth_token", ""),
                "device-id": self.config.get("device_id", ""),
            }

        if device_type == "mini_program":
            headers: dict[str, str] = {
                "Content-Type": "application/json;charset=utf-8",
                "auth-token": self.config.get("auth_token", ""),
                "device-type": "mini_program",
                "js-version": self.config.get("js_version", "1.0.5"),
                "language": "CN",
                "system-language": "CN",
                "rcs": str(self.config.get("rcs", "3")),
                "User-Agent": self.config.get(
                    "user_agent",
                    (
                        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                        "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                        "Mobile/15E148 MicroMessenger/8.0.75 "
                        "NetType/WIFI Language/zh_CN"
                    ),
                ),
            }
            if self.config.get("treq_id"):
                headers["treq-id"] = self.config["treq_id"]
            else:
                headers["treq-id"] = self._fresh_treq_id()
            if self.config.get("x_uniq"):
                headers["X-UNIQ"] = self.config["x_uniq"]
            province = str(self.config.get("provinceCode", ""))
            city = str(self.config.get("cityCode", ""))
            district = str(self.config.get("districtCode", ""))
            for key, value in (
                ("provinceCode", province),
                ("cityCode", city),
                ("districtCode", district),
                ("amapProvinceCode", self.config.get("amapProvinceCode", province)),
                ("amapCityCode", self.config.get("amapCityCode", city)),
                ("amapDistrictCode", self.config.get("amapDistrictCode", district)),
            ):
                if value:
                    headers[key] = str(value)
            headers["Referer"] = self.config.get(
                "referer",
                "https://servicewechat.com/wxb344a8513eaaf849/392/page-frame.html",
            )
            if self.config.get("extra_headers"):
                headers.update(self.config["extra_headers"])
            return headers

        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "Host": "api-sams.walmartmobile.cn",
            "auth-token": self.config.get("auth_token", ""),
            "latitude": str(self.config.get("latitude", "")),
            "longitude": str(self.config.get("longitude", "")),
            "device-type": device_type,
            "app-version": self.config.get("app_version", "5.0.145.1"),
            "device-name": self.config.get("device_name", "iPhone16,2"),
            "device-os-version": self.config.get("device_os_version", "18.0"),
            "User-Agent": self.config.get(
                "user_agent",
                "SamClub/5.0.145 (iPhone; iOS 18.0; Scale/3.00)",
            ),
            "system-language": "CN",
            "Accept-Language": "zh-Hans-CN;q=1",
            "apptype": "ios",
        }
        if self.config.get("device_id"):
            headers["device-id"] = self.config["device_id"]
        if self.config.get("extra_headers"):
            headers.update(self.config["extra_headers"])
        return headers

    def _maybe_sign_headers(self, body: dict[str, Any]) -> dict[str, str]:
        """Android 端可选签名头（st/n/t），配置 sign_url 时通过外部服务签名。"""
        sign_url = self.config.get("sign_url")
        if not sign_url:
            return {}

        t = str(int(time.time() * 1000))
        n = uuid.uuid4().hex
        auth_token = self.config.get("auth_token", "")
        data_json = json.dumps(body, separators=(",", ":"), ensure_ascii=False)
        sign_text = f"{t}{data_json}{n}{auth_token}"

        resp = requests.post(
            sign_url,
            json={"text": sign_text},
            timeout=15,
        )
        resp.raise_for_status()
        signed = resp.json().get("sign") or resp.json().get("st")
        if not signed:
            raise RuntimeError("sign_url 未返回 sign/st 字段")

        return {"t": t, "n": n, "st": signed, "sy": "0", "spv": "1.1", "rcs": "1", "sny": "c"}

    def _post(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        url = f"{API_BASE}/{path.lstrip('/')}"
        headers = {**self.session.headers, **self._maybe_sign_headers(body)}
        resp = self.session.post(
            url,
            headers=headers,
            data=json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode("utf-8"),
            timeout=20,
        )
        resp.raise_for_status()
        payload = resp.json()
        if not payload.get("success", True) and payload.get("code") not in (None, "Success"):
            msg = payload.get("msg") or payload.get("errorMsg") or str(payload)
            code = payload.get("code")
            if code in ("ILLEGAL_REQUEST",) and self.is_mini_program() and "goods-portal" in path:
                raise RuntimeError(f"山姆 API 错误: {msg}\n\n{MINI_PROGRAM_GOODS_HINT}")
            if code == "UPGRADE_APP_VERSION":
                raise RuntimeError(
                    f"山姆 API 错误: {msg} (code={code})\n\n"
                    "请在 sams_config.json 中更新 app_version（当前最新约 5.0.145.1），"
                    "并确保 auth-token 是从山姆 App 抓包获取（非小程序 token）。"
                )
            if code == "INVALID_REQUEST_PARAMS" and any(
                x in path for x in ("goods-portal", "trade/", "cart/")
            ):
                raise RuntimeError(
                    f"山姆 API 错误: {msg} (code={code})\n\n"
                    "常见原因：auth-token / device-id 不是从「商品搜索」同一条 App 抓包复制的。\n"
                    "解决步骤：\n"
                    "  1. 山姆 App 内搜索商品，在 Charles 找到 goods-portal/spu/search\n"
                    "  2. 复制该请求的 auth-token、device-id、Request Body 到 capture.json\n"
                    "  3. 运行: python3 scripts/fetch_sams_products.py replay -f capture.json\n"
                    "或在 sams_config.json 设置 search_capture 指向抓包文件（见 capture.example.json）"
                )
            raise RuntimeError(f"山姆 API 错误: {msg} (code={code})")
        return payload

    def test_auth(self) -> dict[str, Any]:
        """验证 auth-token 是否有效（小程序配置可用）。"""
        body = self.config.get("test_body") or {"configKeyList": ["homePageConfig"]}
        path = self.config.get("test_path") or "configuration/portal/getConfig"
        payload = self._post(path, body)
        return payload

    def replay_captured(self, capture: dict[str, Any]) -> dict[str, Any]:
        """重放 Charles 导出的完整请求（url + headers + body）。"""
        url = capture.get("url") or capture.get("request_url")
        if not url:
            raise ValueError("抓包文件需包含 url 或 request_url")

        raw_headers = capture.get("headers") or capture.get("request_headers") or {}
        headers = {**self._build_headers(), **normalize_capture_headers(raw_headers)}
        if self.config.get("auth_token"):
            headers["auth-token"] = self.config["auth_token"]
        if self.config.get("device_id"):
            headers["device-id"] = self.config["device_id"]
        if self.is_mini_program():
            headers["treq-id"] = self._fresh_treq_id()

        body = capture.get("body") or capture.get("request_body")
        if isinstance(body, dict):
            body = json.loads(json.dumps(body, ensure_ascii=False))
            for store in body.get("storeInfoVOList") or []:
                if isinstance(store, dict):
                    for key in ("storeId", "storeType"):
                        val = store.get(key)
                        if isinstance(val, str) and val.isdigit():
                            store[key] = int(val)
        if body is None:
            data = None
        elif isinstance(body, str):
            data = body.encode("utf-8")
        else:
            data = json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

        resp = requests.post(url, headers=headers, data=data, timeout=20)
        resp.raise_for_status()
        payload = resp.json()
        if not payload.get("success", True) and payload.get("code") not in (None, "Success"):
            msg = payload.get("msg") or payload.get("errorMsg") or str(payload)
            code = payload.get("code")
            if code == "INVALID_REQUEST_PARAMS":
                missing = [k for k in ("st", "t", "n") if k not in headers and k not in {h.lower() for h in headers}]
                hint = (
                    "\n\nApp 搜索接口需要一次性签名头 t / n / st（Charles Request Headers 里），"
                    "且无法重复使用过期的签名。\n"
                    "推荐改用法：在 App 搜索成功后，复制 Response JSON →\n"
                    "  python3 scripts/fetch_sams_products.py parse -f response.json --import"
                )
                if missing:
                    hint = f"\n\n缺少签名头: {', '.join(missing)}" + hint
                raise RuntimeError(f"山姆 API 错误: {msg} (code={code}){hint}")
            raise RuntimeError(f"山姆 API 错误: {msg} (code={code})")
        return payload

    def _default_search_body(self, *, keyword: str, page_num: int, page_size: int) -> dict[str, Any]:
        device_id = self.config.get("device_id", "")
        return {
            "userUid": self.config.get("user_uid") or device_id,
            "pageNum": page_num,
            "pageSize": page_size,
            "keyword": keyword,
            "rewriteWord": keyword,
            "filter": [],
            "storeInfoVOList": self.config.get("store_info_list", []),
            "addressVO": self.config.get(
                "address_vo",
                {
                    "cityName": "",
                    "countryName": "",
                    "detailAddress": "",
                    "districtName": "",
                    "provinceName": "",
                },
            ),
            "uid": device_id,
            "uidType": 3,
            "sort": "0",
        }

    def _default_detail_body(self, spu_id: str) -> dict[str, Any]:
        device_id = self.config.get("device_id", "")
        store_list = self.config.get("store_info_list", [])
        store_id = store_list[0]["storeId"] if store_list else 6758
        return {
            "spuId": spu_id,
            "storeId": store_id,
            "storeInfoVOList": store_list,
            "uid": device_id,
            "uidType": 3,
            "addressVO": self.config.get("address_vo", {}),
        }

    def _load_capture_file(self, path: str | Path) -> dict[str, Any]:
        return json.loads(Path(path).read_text(encoding="utf-8"))

    def _apply_keyword_to_body(self, body: Any, keyword: str) -> Any:
        if not isinstance(body, dict):
            return body
        updated = json.loads(json.dumps(body, ensure_ascii=False))
        for key in ("keyword", "rewriteWord", "searchWord", "query"):
            if key in updated:
                updated[key] = keyword
        return updated

    def search_via_capture(
        self,
        keyword: str,
        capture_path: str | Path,
    ) -> list[SamsProduct]:
        capture = self._load_capture_file(capture_path)
        capture = json.loads(json.dumps(capture, ensure_ascii=False))
        body = capture.get("body") or capture.get("request_body")
        if isinstance(body, dict):
            capture["body"] = self._apply_keyword_to_body(body, keyword)
        payload = self.replay_captured(capture)
        return [p for p in extract_products_from_response(payload) if p.image_url]

    def search(
        self,
        keyword: str,
        *,
        page_num: int = 1,
        page_size: int = 20,
        max_pages: int = 1,
    ) -> list[SamsProduct]:
        self._ensure_goods_api_supported()

        capture_path = self.config.get("search_capture")
        if capture_path:
            products = self.search_via_capture(keyword, capture_path)
            if products:
                return products

        all_products: list[SamsProduct] = []
        seen: set[str] = set()

        for page in range(page_num, page_num + max_pages):
            body = self._default_search_body(
                keyword=keyword,
                page_num=page,
                page_size=page_size,
            )
            if self.config.get("search_body_extra"):
                body.update(self.config["search_body_extra"])
            payload = self._post("goods-portal/spu/search", body)
            page_products = extract_products_from_response(payload)
            if not page_products:
                break
            for product in page_products:
                if product.external_id not in seen:
                    seen.add(product.external_id)
                    all_products.append(product)

        return [p for p in all_products if p.image_url]

    def fetch_detail(self, spu_id: str) -> SamsProduct | None:
        self._ensure_goods_api_supported()
        body = self._default_detail_body(spu_id)
        detail_paths = (
            "goods-portal/spu/querySpuDetail",
            "goods-portal/spu/getDetail",
            "goods-portal/spu/queryDetail",
        )
        last_error: Exception | None = None
        for path in detail_paths:
            try:
                payload = self._post(path, body)
                products = extract_products_from_response(payload)
                if products:
                    product = products[0]
                    product.external_id = spu_id
                    if product.image_url:
                        return product
            except Exception as exc:  # noqa: BLE001 — 依次尝试多个详情接口
                last_error = exc
                continue

        if last_error:
            raise last_error
        return None

    def fetch_by_ids(self, spu_ids: list[str]) -> list[SamsProduct]:
        products: list[SamsProduct] = []
        for spu_id in spu_ids:
            spu_id = spu_id.strip()
            if not spu_id:
                continue
            detail = self.fetch_detail(spu_id)
            if detail:
                products.append(detail)
        return products


class ProjectImporter:
    def __init__(
        self,
        *,
        base_url: str,
        admin_password: str,
    ):
        self.base_url = base_url.rstrip("/")
        self.admin_password = admin_password

    def import_product(self, product: SamsProduct, *, splittable: bool = False) -> dict[str, Any]:
        resp = requests.post(
            f"{self.base_url}/api/products",
            headers={
                "Content-Type": "application/json",
                "x-admin-password": self.admin_password,
            },
            json=product.to_project_payload(splittable=splittable),
            timeout=30,
        )
        if resp.status_code == 409:
            return {"status": "skipped", "externalId": product.external_id, "reason": "已存在"}
        resp.raise_for_status()
        data = resp.json()
        if not data.get("success"):
            raise RuntimeError(data.get("message") or "入库失败")
        return {"status": "created", "externalId": product.external_id, "data": data.get("data")}
