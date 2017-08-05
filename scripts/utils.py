from datetime import datetime
import os
import sys

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

def compile_ts(is_client=False):
    cmd = "npm run compile"
    if is_client:
        cmd += "-client"
    if os.system(cmd) is 0:
        print("Finished compilation.")
    else:
        print("Compilation failed: non-zero exit code detected.")

def read_file(path):
    handle = open(path, "r")
    data = handle.read()
    handle.close()
    return data

def get_python_version():
    return sys.version_info[2]

def get_input(prompt=""):
    # pylint:disable=E0602
    return raw_input(prompt) if get_python_version() == 2 else input(prompt)
