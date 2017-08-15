import json
import os
import shutil
import sys
import utils

SERVER_DIR = utils.get_server_dir()

class ModuleInstaller:
    def __init__(self, git_url):
        self.git_url = git_url
        self.name = self.git_url.split("/")[-1].split(".git")[0]
        self.dir = SERVER_DIR + "modules/" + self.name
        self.config = {}

    def install(self):
        if os.system("git clone %s %s" % (self.git_url, self.dir)) is not 0:
            print("Couldn't clone the repository. Please check that the Git URL exists and that your SSH key is valid.")
            return
        self.config = json.loads(utils.read_file(self.dir + "/eta.json"))
        self.fire_hook("preinstall")
        if self.config["name"] != self.name:
            self.name = self.config["name"]
            old_dir = self.dir
            self.dir = SERVER_DIR + "modules/" + self.name
            shutil.move(old_dir, self.dir)
        os.chdir(self.dir)
        os.system("npm i --only=dev")
        os.system("npm i --only=prod")
        for static_dir in self.config["dirs"]["staticFiles"]:
            js_dir = "%s/%s/js" % (self.dir, static_dir)
            if not os.path.isdir(js_dir):
                continue
            os.chdir(js_dir)
            print(os.getcwd())
            os.system("npm i --only=dev")
            if os.path.exists(js_dir + "/typings.json"):
                os.system("node " + SERVER_DIR + "node_modules/typings/dist/bin.js i")
            os.chdir(self.dir)
        self.fire_hook("postinstall")
        os.chdir(SERVER_DIR)
        os.system("npm run generate-ci")
        os.system("npm run compile-client")

    def fire_hook(self, hook_name):
        if "hooks" not in self.config:
            return
        if hook_name not in self.config["hooks"]:
            return
        for hook in self.config["hooks"][hook_name]:
            if "cwd" in hook:
                os.chdir(self.dir + "/" + hook["cwd"])
            os.system(hook["exec"])
            os.chdir(self.dir)

def main():
    git_url = sys.argv[1] if len(sys.argv) >= 2 else utils.get_input("Git URL: ")
    ModuleInstaller(git_url).install()

if __name__ == "__main__":
    main()
