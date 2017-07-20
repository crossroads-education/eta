from datetime import datetime
import os

def get_server_dir():
    cwd = os.getcwd().replace('\\', '/')
    if cwd.endswith("scripts"):
        tokens = cwd.split("/")
        del tokens[-1]
        cwd = "/".join(tokens)
    return cwd + "/"

def get_timestamp():
    return datetime.now().strftime("%Y-%m-%d %I:%M%p")

def to_camel_case(string):
    return string[0].lower() + string[1:]

def compile_ts():
    if os.system("npm run compile") is 0:
        print("Finished compilation.")
    else:
        print("Compilation failed: non-zero exit code detected.")
