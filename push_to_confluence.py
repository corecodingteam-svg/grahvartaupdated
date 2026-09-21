import requests
import base64
import json
import re
import os

CONFLUENCE_URL = "https://corecodingteam.atlassian.net/wiki"
EMAIL = "corecodingteam@gmail.com"
TOKEN = "ATATT3xFfGF06H50PBRtqQFnaVLKHQs53PNGuNTkZjMzyRQmglYxKQNvsX356_Rmrj2XZOakT7D78FT97r9SIqaLSkguSYw9CRkPmC7njzpQFDGXUFZjXMOmvHikwDRo1dHWCQzgFO1Z0KhJOQumtA6g7UGAxS4cYiNhlhEm1w5LlHc6TNF87GU=4E560EFA"
SPACE_KEY = "GRAHVARTA"
SPACE_NAME = "GrahVarta"
DOCS_DIR = r"d:\grahvartaapp\docs"

credentials = base64.b64encode(f"{EMAIL}:{TOKEN}".encode()).decode()
HEADERS = {
    "Authorization": f"Basic {credentials}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

API = f"{CONFLUENCE_URL}/rest/api"


def get_space():
    r = requests.get(f"{API}/space/{SPACE_KEY}", headers=HEADERS)
    if r.status_code == 200:
        print(f"Space '{SPACE_KEY}' already exists.")
        return r.json()
    return None


def create_space():
    payload = {
        "key": SPACE_KEY,
        "name": SPACE_NAME,
        "description": {
            "plain": {
                "value": "Technical documentation for the GrahVarta astrology platform.",
                "representation": "plain"
            }
        }
    }
    r = requests.post(f"{API}/space", headers=HEADERS, json=payload)
    if r.status_code in (200, 201):
        print(f"Space '{SPACE_KEY}' created.")
        return r.json()
    else:
        print(f"Failed to create space: {r.status_code} {r.text}")
        return None


def get_space_homepage():
    r = requests.get(f"{API}/space/{SPACE_KEY}", headers=HEADERS, params={"expand": "homepage"})
    if r.status_code == 200:
        return r.json().get("homepage", {}).get("id")
    return None


def markdown_to_confluence_storage(md_text):
    """Convert markdown to Confluence storage format (simplified)."""
    lines = md_text.split('\n')
    output = []
    in_code = False
    code_lang = ""
    code_lines = []
    in_table = False
    table_rows = []
    in_mermaid = False
    mermaid_lines = []

    i = 0
    while i < len(lines):
        line = lines[i]

        # Mermaid diagrams
        if line.strip().startswith("```mermaid"):
            in_mermaid = True
            mermaid_lines = []
            i += 1
            continue
        if in_mermaid:
            if line.strip() == "```":
                in_mermaid = False
                mermaid_code = "\n".join(mermaid_lines)
                output.append(
                    f'<ac:structured-macro ac:name="code">'
                    f'<ac:parameter ac:name="language">text</ac:parameter>'
                    f'<ac:plain-text-body><![CDATA[mermaid\n{mermaid_code}]]></ac:plain-text-body>'
                    f'</ac:structured-macro>'
                )
            else:
                mermaid_lines.append(line)
            i += 1
            continue

        # Code blocks
        if line.strip().startswith("```"):
            if not in_code:
                in_code = True
                code_lang = line.strip()[3:].strip() or "text"
                code_lines = []
            else:
                in_code = False
                code_content = "\n".join(code_lines)
                output.append(
                    f'<ac:structured-macro ac:name="code">'
                    f'<ac:parameter ac:name="language">{code_lang}</ac:parameter>'
                    f'<ac:plain-text-body><![CDATA[{code_content}]]></ac:plain-text-body>'
                    f'</ac:structured-macro>'
                )
            i += 1
            continue
        if in_code:
            code_lines.append(line)
            i += 1
            continue

        # Tables
        if line.strip().startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            # Skip separator rows like |---|---|
            if all(re.match(r'^[-:]+$', c) for c in cells if c):
                i += 1
                continue
            if not in_table:
                in_table = True
                table_rows = []
                # Header row
                header_cells = "".join(f"<th>{escape_xml(c)}</th>" for c in cells)
                table_rows.append(f"<tr>{header_cells}</tr>")
            else:
                data_cells = "".join(f"<td>{inline_format(c)}</td>" for c in cells)
                table_rows.append(f"<tr>{data_cells}</tr>")
            i += 1
            # Check if next line is still a table
            if i >= len(lines) or not lines[i].strip().startswith("|"):
                output.append(f'<table><tbody>{"".join(table_rows)}</tbody></table>')
                in_table = False
                table_rows = []
            continue

        # Headings
        h_match = re.match(r'^(#{1,6})\s+(.*)', line)
        if h_match:
            level = len(h_match.group(1))
            text = inline_format(h_match.group(2))
            output.append(f"<h{level}>{text}</h{level}>")
            i += 1
            continue

        # Blockquotes
        if line.strip().startswith("> "):
            content = inline_format(line.strip()[2:])
            output.append(f'<ac:structured-macro ac:name="info"><ac:rich-text-body><p>{content}</p></ac:rich-text-body></ac:structured-macro>')
            i += 1
            continue

        # Horizontal rule
        if re.match(r'^---+$', line.strip()):
            output.append("<hr/>")
            i += 1
            continue

        # Unordered list
        if line.strip().startswith("- ") or line.strip().startswith("* "):
            items = []
            while i < len(lines) and (lines[i].strip().startswith("- ") or lines[i].strip().startswith("* ")):
                item_text = re.sub(r'^[\s]*[-*]\s+', '', lines[i])
                items.append(f"<li>{inline_format(item_text)}</li>")
                i += 1
            output.append(f'<ul>{"".join(items)}</ul>')
            continue

        # Ordered list
        if re.match(r'^\d+\.\s+', line.strip()):
            items = []
            while i < len(lines) and re.match(r'^\d+\.\s+', lines[i].strip()):
                item_text = re.sub(r'^\d+\.\s+', '', lines[i].strip())
                items.append(f"<li>{inline_format(item_text)}</li>")
                i += 1
            output.append(f'<ol>{"".join(items)}</ol>')
            continue

        # Empty line
        if not line.strip():
            output.append("")
            i += 1
            continue

        # Paragraph
        output.append(f"<p>{inline_format(line)}</p>")
        i += 1

    return "\n".join(output)


def escape_xml(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def inline_format(text):
    # Bold
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    # Italic
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    # Inline code
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    # Links [text](url)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    # Escape remaining XML chars (that aren't part of tags)
    # Only escape & that aren't already entities
    text = re.sub(r'&(?!amp;|lt;|gt;|quot;)', '&amp;', text)
    return text


def page_exists(title, space_key):
    r = requests.get(f"{API}/content", headers=HEADERS, params={
        "title": title,
        "spaceKey": space_key,
        "expand": "version"
    })
    if r.status_code == 200:
        results = r.json().get("results", [])
        if results:
            return results[0]["id"], results[0]["version"]["number"]
    return None, None


def create_page(title, body, parent_id, space_key):
    page_id, version = page_exists(title, space_key)
    if page_id:
        # Update existing
        payload = {
            "version": {"number": version + 1},
            "title": title,
            "type": "page",
            "body": {
                "storage": {
                    "value": body,
                    "representation": "storage"
                }
            }
        }
        r = requests.put(f"{API}/content/{page_id}", headers=HEADERS, json=payload)
        if r.status_code == 200:
            print(f"  Updated: {title}")
            return r.json()["id"]
        else:
            print(f"  Failed to update '{title}': {r.status_code} {r.text[:200]}")
            return None
    else:
        payload = {
            "type": "page",
            "title": title,
            "space": {"key": space_key},
            "ancestors": [{"id": parent_id}],
            "body": {
                "storage": {
                    "value": body,
                    "representation": "storage"
                }
            }
        }
        r = requests.post(f"{API}/content", headers=HEADERS, json=payload)
        if r.status_code in (200, 201):
            print(f"  Created: {title}")
            return r.json()["id"]
        else:
            print(f"  Failed to create '{title}': {r.status_code} {r.text[:200]}")
            return None


def read_doc(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def main():
    # Ensure space exists
    space = get_space()
    if not space:
        space = create_space()
    if not space:
        print("Cannot proceed without a space.")
        return

    # Get homepage ID
    homepage_id = get_space_homepage()
    print(f"Space homepage ID: {homepage_id}")

    # Create root GrahVarta doc page
    root_md = read_doc(os.path.join(DOCS_DIR, "index.md"))
    root_body = markdown_to_confluence_storage(root_md)
    root_id = create_page("GrahVarta — Technical Documentation", root_body, homepage_id, SPACE_KEY)
    if not root_id:
        print("Failed to create root page.")
        return

    # Define page structure: (title, file_path, parent_id_ref)
    # parent_id_ref is either root_id or a section id
    pages = [
        # Architecture section
        ("Architecture", None, root_id),  # section page
        ("System Overview", os.path.join(DOCS_DIR, "architecture", "system-overview.md"), "Architecture"),
        ("Component Architecture", os.path.join(DOCS_DIR, "architecture", "architecture.md"), "Architecture"),
        # API section
        ("API Reference", os.path.join(DOCS_DIR, "api", "api-reference.md"), root_id),
        # Database section
        ("Database", None, root_id),
        ("Data Model", os.path.join(DOCS_DIR, "database", "data-model.md"), "Database"),
        # Features section
        ("Features", None, root_id),
        ("Real-Time System", os.path.join(DOCS_DIR, "features", "real-time.md"), "Features"),
        # Mobile section
        ("Mobile Applications", None, root_id),
        ("Flutter Apps", os.path.join(DOCS_DIR, "mobile", "flutter-apps.md"), "Mobile Applications"),
        # Deployment section
        ("Deployment", None, root_id),
        ("Deployment Guide", os.path.join(DOCS_DIR, "deployment", "deployment-guide.md"), "Deployment"),
    ]

    # Track created section page IDs by title
    section_ids = {}

    for title, file_path, parent_ref in pages:
        # Resolve parent
        if isinstance(parent_ref, str):
            parent_id = section_ids.get(parent_ref, root_id)
        else:
            parent_id = parent_ref

        if file_path is None:
            # Section container page
            body = f"<p>Section: {title}</p>"
            page_id = create_page(title, body, parent_id, SPACE_KEY)
            if page_id:
                section_ids[title] = page_id
        else:
            md = read_doc(file_path)
            body = markdown_to_confluence_storage(md)
            create_page(title, body, parent_id, SPACE_KEY)

    print("\nDone! All pages pushed to Confluence.")
    print(f"View at: {CONFLUENCE_URL}/wiki/spaces/{SPACE_KEY}/pages")


if __name__ == "__main__":
    main()
