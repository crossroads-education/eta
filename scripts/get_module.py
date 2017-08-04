import json
import os
import sys
import utils
from compile_client import compile_module as compile_client

SERVER_DIR = utils.get_server_dir()

def get_module(git_url, module_name):
    module_dir = SERVER_DIR + "modules/" + module_name
    if os.system("git clone %s %s" % (git_url, module_dir)) is not 0:
        print("Couldn't clone the repository. Please check that the Git URL exists and that your SSH key is valid.")
        return
    os.chdir(module_dir)
    os.system("npm i --only=dev")
    os.system("npm i --only=prod")
    module_config = json.loads(utils.read_file(module_dir + "/eta.json"))
    for static_dir in module_config["staticDirs"]:
        js_dir = "%s/%s/js" % (module_dir, static_dir)
        if not os.path.isdir(js_dir):
            continue
        os.chdir(js_dir)
        print(os.getcwd())
        os.system("npm i --only=dev")
        if os.path.exists(js_dir + "/typings.json"):
            os.system("node " + SERVER_DIR + "node_modules/typings/dist/bin.js i")
        os.chdir(module_dir)
    os.chdir(SERVER_DIR)
    os.system("npm run generate")
    compile_client(module_name)

def main():
    git_url = None
    module_name = None
    if len(sys.argv) == 3:
        git_url = sys.argv[1]
        module_name = sys.argv[2]
    else:
        git_url = utils.get_input("Git URL: ")
        module_name = utils.get_input("Module name: ")
    get_module(git_url, module_name)

if __name__ == "__main__":
    main()
