"""Talk to the live Blender addon socket (same protocol as blender-mcp server).
Usage:
  python blend.py get_scene_info
  python blend.py execute_code --code script.py
  python blend.py <type> --params '{"a":1}'
"""
import socket, json, sys

HOST, PORT = "127.0.0.1", 9876

def send(cmd_type, params=None):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(180.0)
    try:
        s.connect((HOST, PORT))
        s.sendall(json.dumps({"type": cmd_type, "params": params or {}}).encode("utf-8"))
        chunks = []
        while True:
            chunk = s.recv(65536)
            if not chunk:
                break
            chunks.append(chunk)
            try:
                data = b"".join(chunks)
                resp = json.loads(data.decode("utf-8"))
                break
            except json.JSONDecodeError:
                continue
        return resp
    finally:
        s.close()

def main():
    cmd = sys.argv[1]
    params = {}
    if "--code" in sys.argv:
        path = sys.argv[sys.argv.index("--code") + 1]
        params["code"] = open(path, encoding="utf-8").read()
    if "--params" in sys.argv:
        params.update(json.loads(sys.argv[sys.argv.index("--params") + 1]))
    resp = send(cmd, params)
    if resp.get("status") == "error":
        print("BLENDER ERROR:", resp.get("message"))
        sys.exit(1)
    print(json.dumps(resp.get("result", resp), indent=1)[:6000])

if __name__ == "__main__":
    main()
