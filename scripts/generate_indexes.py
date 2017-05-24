import json
import os
import utils

"""
{
  exclude: string[];
  filename: string;
  isModel: boolean;
  dirs: string[];
}[]
"""

def generate_model(path, module_name):
    return """import {name} from "./{path}";
export {{default as {name}}} from "./{path}";
export let {lowerName}: orm.Repository<{name}> = null;
""".format(name=module_name, lowerName=utils.to_camel_case(module_name), path=path)

def generate_export(path, module_name):
    return "export {{default as {name}}} from \"./{path}\";".format(name=module_name, path=path)

def generate(config):
    server_dir = utils.get_server_dir()
    lines = [
        "// Automatically generated by /scripts/generate_indexes.py at " + utils.get_timestamp()
    ]
    if "isModel" in config:
        basedir = os.path.dirname(server_dir + config["filename"])
        relpath = os.path.relpath(server_dir, basedir).replace("\\", "/")
        lines.append("import * as orm from \"typeorm\";")
        lines.append("import * as eta from \"{}/eta\";\n".format(relpath))
    basedir = os.path.dirname(server_dir + config["filename"])
    exclude = config["exclude"] if "exclude" in config else []
    for dirname in config["dirs"]:
        for root, _, files in os.walk(server_dir + dirname):
            for filename in files:
                if filename == "index.js" or filename in exclude or not filename.endswith(".js"):
                    continue
                module_name = filename.split("/")[0].split(".")[0]
                path = os.path.relpath(root + "/" + filename, start=basedir)
                path = ".".join(path.split(".")[0:-1]).replace("\\", "/")
                if "isModel" in config:
                    lines.append(generate_model(path, module_name))
                else:
                    lines.append(generate_export(path, module_name))
    handle = open(server_dir + config["filename"], "w")
    handle.write("\n".join(lines))
    handle.close()
    print("Wrote to " + config["filename"])

def main():
    server_dir = utils.get_server_dir()
    handle = open(server_dir + "indexes.json", "r")
    configs = json.loads(handle.read())
    handle.close()
    for config in configs:
        generate(config)
    # utils.compile_ts()

if __name__ == "__main__":
    main()
