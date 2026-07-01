#!/usr/bin/env python3
"""从山姆会员店抓取商品（含图片）并导入 sam-buying-agent 项目。

用法示例：

  # 1. 复制配置并填入抓包 headers
  cp scripts/sams_config.example.json scripts/sams_config.json

  # 2. 按关键词搜索并预览
  python scripts/fetch_sams_products.py search --keyword 瑞士卷

  # 3. 按 spuId 抓取并导入项目
  python scripts/fetch_sams_products.py import --ids 1489392,12422274

  # 4. 启动本地代理，供 .env 中 SAMS_PRODUCT_API_URL 使用
  python scripts/fetch_sams_products.py serve --port 8765

  # 5. 解析已保存的抓包 JSON（Charles 导出响应体）
  python scripts/fetch_sams_products.py parse --file captured.json --import

抓包说明：打开山姆微信小程序，用 Charles/Fiddler 抓取 api-sams.walmartmobile.cn
的请求，从 headers 复制 auth-token、device-id，写入 scripts/sams_config.json。
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

from sams_client import (  # noqa: E402
    ProjectImporter,
    SamsClient,
    extract_products_from_response,
)

DEFAULT_CONFIG = SCRIPT_DIR / "sams_config.json"


def load_env() -> None:
    load_dotenv(ROOT_DIR / ".env")


def resolve_config(path: str | None) -> SamsClient:
    config_path = Path(path) if path else DEFAULT_CONFIG
    if not config_path.exists():
        print(
            f"未找到配置文件: {config_path}\n"
            f"请先执行: cp {SCRIPT_DIR / 'sams_config.example.json'} {DEFAULT_CONFIG}",
            file=sys.stderr,
        )
        sys.exit(1)
    client = SamsClient.from_file(config_path)
    if not client.config.get("auth_token"):
        print("警告: auth_token 为空，API 调用可能失败。请从小程序抓包填入配置。", file=sys.stderr)
    elif (
        not client.config.get("device_id")
        and client.config.get("device_type") not in ("mini_program", "h5")
    ):
        print("警告: device_id 为空，若使用 App 抓包请填入 device-id。", file=sys.stderr)
    return client


def print_products(products: list, *, as_json: bool = False) -> None:
    if as_json:
        print(
            json.dumps(
                [
                    {
                        "externalId": p.external_id,
                        "name": p.name,
                        "imageUrl": p.image_url,
                        "priceCents": p.price_cents,
                        "priceYuan": f"{p.price_cents / 100:.2f}",
                    }
                    for p in products
                ],
                ensure_ascii=False,
                indent=2,
            )
        )
        return

    if not products:
        print("未找到带图片的商品。")
        return

    for idx, p in enumerate(products, 1):
        print(f"[{idx}] {p.name}")
        print(f"    ID: {p.external_id}  价格: ¥{p.price_cents / 100:.2f}")
        print(f"    图片: {p.image_url}")
        print()


def cmd_test(args: argparse.Namespace) -> None:
    client = resolve_config(args.config)
    try:
        payload = client.test_auth()
        code = payload.get("code")
        print(f"✓ auth-token 有效 (code={code})")
        if args.json:
            print(json.dumps(payload, ensure_ascii=False, indent=2))
        print()
        print("说明: test 只验证配置类接口。商品 search 还需 App 内 search 抓包，见 capture.example.json")
        if client.is_mini_program():
            print("当前为 mini_program 模式，search 不可用，请用 parse 或 replay。")
        elif not client.config.get("search_capture"):
            print("建议在 sams_config.json 添加 search_capture 指向 App search 抓包文件。")
    except Exception as exc:  # noqa: BLE001
        print(f"✗ 验证失败: {exc}", file=sys.stderr)
        print("请重新抓包更新 scripts/sams_config.json 中的 auth_token", file=sys.stderr)
        sys.exit(1)


def cmd_replay(args: argparse.Namespace) -> None:
    client = resolve_config(args.config)
    capture = json.loads(Path(args.file).read_text(encoding="utf-8"))
    try:
        payload = client.replay_captured(capture)
    except RuntimeError as exc:
        print(f"✗ {exc}", file=sys.stderr)
        sys.exit(1)

    if not payload.get("success") and payload.get("code") not in (None, "Success"):
        code = payload.get("code")
        msg = payload.get("msg") or payload.get("errorMsg")
        print(f"✗ API 返回失败: {msg} (code={code})", file=sys.stderr)
        print("提示: 抓包 headers 需用 auth-token（连字符），或需包含 t/n/st 签名头。", file=sys.stderr)
        print("更简单: 在 App 搜索成功后，复制 Response JSON 保存，用 parse 命令导入。", file=sys.stderr)
        sys.exit(1)

    products = extract_products_from_response(payload)
    products = [p for p in products if p.image_url]
    print_products(products, as_json=args.json)
    if not products and args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    if not products:
        print("未解析到商品。若 App 里搜索已成功，请改保存 Response JSON 并用 parse 导入。", file=sys.stderr)
    if args.import_to_project:
        if not products:
            print("响应中未解析到带图片的商品，请检查抓包文件。", file=sys.stderr)
            sys.exit(1)
        do_import(products, splittable=args.splittable)


def cmd_search(args: argparse.Namespace) -> None:
    client = resolve_config(args.config)
    capture = args.capture or client.config.get("search_capture")
    if capture:
        products = client.search_via_capture(args.keyword, capture)
    else:
        products = client.search(
            args.keyword,
            page_size=args.page_size,
            max_pages=args.pages,
        )
    products = [p for p in products if p.image_url]
    print_products(products, as_json=args.json)

    if args.output:
        Path(args.output).write_text(
            json.dumps([p.to_project_payload() for p in products], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"已保存 {len(products)} 条到 {args.output}")


def cmd_fetch(args: argparse.Namespace) -> None:
    client = resolve_config(args.config)
    ids = [x.strip() for x in args.ids.split(",") if x.strip()]
    products = client.fetch_by_ids(ids)
    print_products(products, as_json=args.json)


def cmd_parse(args: argparse.Namespace) -> None:
    raw = json.loads(Path(args.file).read_text(encoding="utf-8"))
    products = extract_products_from_response(raw)
    products = [p for p in products if p.image_url]
    print_products(products, as_json=args.json)

    if args.import_to_project:
        do_import(products, splittable=args.splittable)


def do_import(products: list, *, splittable: bool) -> None:
    load_env()
    base_url = os.getenv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:3000")
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    if not admin_password:
        print("请在 .env 中配置 ADMIN_PASSWORD", file=sys.stderr)
        sys.exit(1)

    importer = ProjectImporter(base_url=base_url, admin_password=admin_password)
    for product in products:
        try:
            result = importer.import_product(product, splittable=splittable)
            status = result["status"]
            ext_id = result["externalId"]
            if status == "created":
                print(f"✓ 已入库: {product.name} ({ext_id})")
            else:
                print(f"· 跳过: {product.name} ({ext_id}) — {result.get('reason')}")
        except Exception as exc:  # noqa: BLE001
            print(f"✗ 失败: {product.name} — {exc}", file=sys.stderr)


def cmd_import(args: argparse.Namespace) -> None:
    client = resolve_config(args.config)
    products: list = []

    if args.keyword:
        products = client.search(args.keyword, page_size=args.page_size, max_pages=args.pages)
    if args.ids:
        products.extend(client.fetch_by_ids([x.strip() for x in args.ids.split(",") if x.strip()]))

    seen: set[str] = set()
    unique: list = []
    for p in products:
        if p.image_url and p.external_id not in seen:
            seen.add(p.external_id)
            unique.append(p)

    if not unique:
        print("没有可导入的商品（需包含图片、名称、价格）。", file=sys.stderr)
        sys.exit(1)

    print(f"准备导入 {len(unique)} 个商品…")
    print_products(unique)
    do_import(unique, splittable=args.splittable)


def cmd_serve(args: argparse.Namespace) -> None:
    client = resolve_config(args.config)

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt: str, *log_args) -> None:  # noqa: A003
            print(f"[proxy] {self.address_string()} {fmt % log_args}")

        def do_GET(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            parts = [p for p in parsed.path.split("/") if p]
            # /api/goods/{id} 或 /goods/{id}
            spu_id = None
            if len(parts) >= 2 and parts[-2] in ("goods", "spu"):
                spu_id = parts[-1]
            elif len(parts) == 1:
                spu_id = parts[0]

            if not spu_id:
                self.send_error(404, "路径应为 /api/goods/{spuId}")
                return

            try:
                product = client.fetch_detail(spu_id)
                if not product:
                    self.send_error(404, f"未找到商品 {spu_id}")
                    return
                body = json.dumps(product.to_proxy_api_payload(), ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except Exception as exc:  # noqa: BLE001
                msg = json.dumps({"success": False, "message": str(exc)}).encode("utf-8")
                self.send_response(502)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(msg)))
                self.end_headers()
                self.wfile.write(msg)

    server = HTTPServer(("127.0.0.1", args.port), Handler)
    print(f"山姆商品代理已启动: http://127.0.0.1:{args.port}/api/goods/{{spuId}}")
    print("在 .env 中设置: SAMS_PRODUCT_API_URL=http://127.0.0.1:8765/api/goods/{id}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="山姆商品抓取并导入 sam-buying-agent")
    parser.add_argument("--config", help=f"配置文件路径，默认 {DEFAULT_CONFIG}")
    sub = parser.add_subparsers(dest="command", required=True)

    p_test = sub.add_parser("test", help="验证 auth-token 是否有效")
    p_test.add_argument("--json", action="store_true", help="输出完整响应")
    p_test.set_defaults(func=cmd_test)

    p_replay = sub.add_parser("replay", help="重放 Charles 抓包的完整请求")
    p_replay.add_argument("--file", "-f", required=True, help="抓包 JSON（含 url、headers、body）")
    p_replay.add_argument("--json", action="store_true")
    p_replay.add_argument("--import", dest="import_to_project", action="store_true")
    p_replay.add_argument("--splittable", action="store_true")
    p_replay.set_defaults(func=cmd_replay)

    p_search = sub.add_parser("search", help="按关键词搜索（需山姆 App 抓包，小程序不可用）")
    p_search.add_argument("--keyword", "-k", required=True, help="搜索关键词，如 瑞士卷")
    p_search.add_argument("--capture", "-c", help="App search 抓包 JSON（见 capture.example.json）")
    p_search.add_argument("--pages", type=int, default=1, help="搜索页数")
    p_search.add_argument("--page-size", type=int, default=20, help="每页条数")
    p_search.add_argument("--json", action="store_true", help="JSON 输出")
    p_search.add_argument("--output", "-o", help="保存为 JSON 文件")
    p_search.set_defaults(func=cmd_search)

    p_fetch = sub.add_parser("fetch", help="按 spuId 抓取详情")
    p_fetch.add_argument("--ids", required=True, help="逗号分隔的 spuId")
    p_fetch.add_argument("--json", action="store_true")
    p_fetch.set_defaults(func=cmd_fetch)

    p_parse = sub.add_parser("parse", help="解析已保存的抓包 JSON 响应")
    p_parse.add_argument("--file", "-f", required=True, help="抓包 JSON 文件路径")
    p_parse.add_argument("--json", action="store_true")
    p_parse.add_argument("--import", dest="import_to_project", action="store_true", help="导入项目")
    p_parse.add_argument("--splittable", action="store_true", help="标记为可拆分拼单")
    p_parse.set_defaults(func=cmd_parse)

    p_import = sub.add_parser("import", help="抓取并导入项目数据库")
    p_import.add_argument("--keyword", "-k", help="搜索关键词")
    p_import.add_argument("--ids", help="逗号分隔 spuId")
    p_import.add_argument("--pages", type=int, default=1)
    p_import.add_argument("--page-size", type=int, default=20)
    p_import.add_argument("--splittable", action="store_true")
    p_import.set_defaults(func=cmd_import)

    p_serve = sub.add_parser("serve", help="启动本地 SAMS_PRODUCT_API_URL 代理")
    p_serve.add_argument("--port", type=int, default=8765)
    p_serve.set_defaults(func=cmd_serve)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    if args.command == "import" and not args.keyword and not args.ids:
        parser.error("import 需要 --keyword 或 --ids")
    args.func(args)


if __name__ == "__main__":
    main()
