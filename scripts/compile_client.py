import json
import os
import utils

SERVER_DIR = utils.get_server_dir()
COMPILER_PATH = SERVER_DIR + "node_modules/typescript/bin/tsc"

def compile_module(module_name):
    module_dir = "%s/modules/%s/" % (utils.get_server_dir(), module_name)
    module_config = json.loads(utils.read_file(module_dir + "eta.json"))
    for static_dir in module_config["staticDirs"]:
        js_dir = module_dir + static_dir + "/js"
        if not os.path.exists(js_dir + "/tsconfig.json"):
            continue
        os.chdir(js_dir)
        os.system("node " + COMPILER_PATH)
        os.chdir(SERVER_DIR)

def main():
    module_names = os.listdir(SERVER_DIR + "modules")
    for module_name in module_names:
        compile_module(module_name)
    print("Finished compiling client-side JS")

if __name__ == "__main__":
    main()
