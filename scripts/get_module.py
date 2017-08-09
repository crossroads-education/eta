import json
import os
import sys
import utils

SERVER_DIR = utils.get_server_dir()

def get_module(git_url):
    module_name = git_url.split("/")[-1].split(".git")[0]
    module_dir = SERVER_DIR + "modules/" + module_name
    if os.system("git clone %s %s" % (git_url, module_dir)) is not 0:
        print("Couldn't clone the repository. Please check that the Git URL exists and that your SSH key is valid.")
        return
    module_config = json.loads(utils.read_file(module_dir + "/eta.json"))
    if module_config["name"] != module_name:
        module_name = module_config["name"]
        old_module_dir = module_dir
        module_dir = SERVER_DIR + "modules/" + module_name
        os.system("mv %s %s" % (old_module_dir, module_dir))
    os.chdir(module_dir)
    os.system("npm i --only=dev")
    os.system("npm i --only=prod")
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
    os.system("npm run compile")
    os.system("npm run generate")
    os.system("npm run compile")
    os.system("npm run compile-client")

def main():
    git_url = sys.argv[1] if len(sys.argv) >= 2 else utils.get_input("Git URL: ")
    get_module(git_url)

if __name__ == "__main__":
    main()
