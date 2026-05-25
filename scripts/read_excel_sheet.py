#!/usr/bin/env python3
"""Read one sheet from an .xlsx workbook and emit rows as JSON or CSV.

This intentionally uses only Python's standard library so the drawio-lei skill
can ingest spreadsheet metadata even when pandas/openpyxl are unavailable.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import zipfile
from pathlib import PurePosixPath
from typing import Any
from xml.etree import ElementTree as ET


NS_MAIN = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
NS_REL = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}
NS_OFFICE_REL = {"r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}


def _text(node: ET.Element | None) -> str:
    if node is None:
        return ""
    return "".join(node.itertext())


def _clean(value: Any) -> Any:
    if isinstance(value, str):
        return value.replace("\xa0", " ").strip()
    return value


def _col_index(cell_ref: str) -> int:
    letters = re.match(r"[A-Z]+", cell_ref.upper())
    if not letters:
        return 0
    total = 0
    for char in letters.group(0):
        total = total * 26 + (ord(char) - ord("A") + 1)
    return total - 1


def _load_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return [_text(si) for si in root.findall("m:si", NS_MAIN)]


def _load_sheet_map(zf: zipfile.ZipFile) -> dict[str, str]:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rel_by_id = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels.findall("r:Relationship", NS_REL)
        if "Id" in rel.attrib and "Target" in rel.attrib
    }

    sheets: dict[str, str] = {}
    for sheet in workbook.findall("m:sheets/m:sheet", NS_MAIN):
        name = sheet.attrib.get("name")
        rel_id = sheet.attrib.get(f"{{{NS_OFFICE_REL['r']}}}id")
        if not name or not rel_id or rel_id not in rel_by_id:
            continue
        target = rel_by_id[rel_id]
        path = str(PurePosixPath("xl") / target)
        sheets[name] = str(PurePosixPath(path))
    return sheets


def _cell_value(cell: ET.Element, shared_strings: list[str]) -> Any:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return _clean(_text(cell.find("m:is", NS_MAIN)))

    raw = _text(cell.find("m:v", NS_MAIN))
    if cell_type == "s":
        try:
            return _clean(shared_strings[int(raw)])
        except (ValueError, IndexError):
            return _clean(raw)
    if cell_type == "b":
        return raw == "1"
    return _clean(raw)


def _read_rows(zf: zipfile.ZipFile, sheet_path: str, shared_strings: list[str]) -> list[list[Any]]:
    root = ET.fromstring(zf.read(sheet_path))
    rows: list[list[Any]] = []
    for row in root.findall(".//m:sheetData/m:row", NS_MAIN):
        values: list[Any] = []
        for cell in row.findall("m:c", NS_MAIN):
            ref = cell.attrib.get("r", "")
            index = _col_index(ref)
            while len(values) <= index:
                values.append("")
            values[index] = _cell_value(cell, shared_strings)
        while values and values[-1] == "":
            values.pop()
        rows.append(values)
    return rows


def _dedupe_headers(headers: list[Any]) -> list[str]:
    seen: dict[str, int] = {}
    result: list[str] = []
    for idx, header in enumerate(headers, start=1):
        name = str(header).strip() or f"column_{idx}"
        count = seen.get(name, 0)
        seen[name] = count + 1
        result.append(name if count == 0 else f"{name}_{count + 1}")
    return result


def read_sheet(path: str, sheet: str | None, header_row: int, include_empty: bool) -> dict[str, Any]:
    with zipfile.ZipFile(path) as zf:
        sheet_map = _load_sheet_map(zf)
        if not sheet_map:
            raise SystemExit("No worksheets found in workbook")
        sheet_name = sheet or next(iter(sheet_map))
        if sheet_name not in sheet_map:
            available = ", ".join(sheet_map)
            raise SystemExit(f"Sheet not found: {sheet_name}. Available sheets: {available}")

        shared_strings = _load_shared_strings(zf)
        raw_rows = _read_rows(zf, sheet_map[sheet_name], shared_strings)

    header_index = max(header_row - 1, 0)
    headers = _dedupe_headers(raw_rows[header_index] if header_index < len(raw_rows) else [])
    records = []
    for raw in raw_rows[header_index + 1 :]:
        if not include_empty and not any(str(value).strip() for value in raw):
            continue
        row = {header: (raw[idx] if idx < len(raw) else "") for idx, header in enumerate(headers)}
        records.append(row)

    return {
        "workbook": path,
        "sheet": sheet_name,
        "headers": headers,
        "rows": records,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", help="Path to .xlsx workbook")
    parser.add_argument("--sheet", help="Worksheet name. Defaults to the first sheet.")
    parser.add_argument("--header-row", type=int, default=1, help="1-based header row. Default: 1")
    parser.add_argument("--format", choices=["json", "csv"], default="json")
    parser.add_argument("--include-empty", action="store_true", help="Keep empty data rows")
    args = parser.parse_args()

    data = read_sheet(args.workbook, args.sheet, args.header_row, args.include_empty)

    if args.format == "csv":
        writer = csv.DictWriter(sys.stdout, fieldnames=data["headers"])
        writer.writeheader()
        writer.writerows(data["rows"])
    else:
        json.dump(data, sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
