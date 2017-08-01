import json
import os
import sys
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
export function {lowerName}(): orm.Repository<{name}> {{ return orm.getRepository({name}); }}
// export let {lowerName}: orm.Repository<{name}> = undefined;
""".format(name=module_name, lowerName=utils.to_camel_case(module_name), path=path)

def generate_index(path, module_name):
    return "export {{default as {name}}} from \"./{path}\";".format(name=module_name, path=path)

def generate_export(path):
    handle = open(path, "r")
    lines = handle.read().replace("\r", "").split("\n")
    handle.close()
    real_lines = []
    for line in lines:
        line = line.replace(" default ", " ")
        raw_line = line.strip()
        if raw_line.startswith("@") or raw_line.startswith("import ") or raw_line == "":
            continue
        if raw_line.startswith("export ") and raw_line.endswith(";"):
            continue
        if raw_line == "// stop-generate":
            real_lines.append("}")
            break
        real_lines.append(line)
    return real_lines

def generate(config, module_dir):
    lines = [
        "// Automatically generated by Eta v2's /scripts/generate_indexes.py"
    ]
    if "prepend" in config:
        lines += config["prepend"]
    if config["type"] == "model":
        basedir = os.path.dirname(module_dir + config["filename"])
        relpath = os.path.relpath(module_dir, basedir).replace("\\", "/")
        lines.append("import * as orm from \"typeorm\";")
        lines.append("import * as eta from \"{}/eta\";\n".format(relpath))
    basedir = os.path.dirname(module_dir + config["filename"])
    exclude = config["exclude"] if "exclude" in config else []
    file_ending = ".ts" if config["type"] == "export" else ".js"
    server_dir = utils.get_server_dir()
    if config["type"] == "export":
        includes = config["include"] if "include" in config else []
        for include_file in includes:
            lines += generate_export(server_dir + include_file)
    for dirname in config["dirs"]:
        real_files = []
        for root, _, files in os.walk(module_dir + dirname):
            for filename in files:
                if filename == "index" + file_ending or not filename.endswith(file_ending):
                    continue
                absolute_filename = root + "/" + filename
                if file_ending == ".js":
                    if not os.path.exists(absolute_filename.replace(".js", ".ts")):
                        continue
                if filename.startswith("I"):
                    real_files.insert(0, absolute_filename)
                else:
                    real_files.append(absolute_filename)
        for filename in real_files:
            module_name = filename.split("/")[-1].split(".")[0]
            if config["type"] != "model" and module_name in exclude:
                continue
            path = os.path.relpath(filename, start=basedir)
            path = ".".join(path.split(".")[0:-1]).replace("\\", "/")
            if config["type"] == "model":
                if module_name in exclude:
                    lines.append(generate_index(path, module_name))
                else:
                    lines.append(generate_model(path, module_name))
            elif config["type"] == "export":
                lines += generate_export(filename)
            else:
                lines.append(generate_index(path, module_name))
    handle = open(module_dir + config["filename"], "w")
    handle.write("\n".join(lines) + "\n")
    handle.close()

def generate_models():
    server_dir = utils.get_server_dir()
    modules = os.listdir(server_dir + "modules")
    model_files = []
    for module_name in modules:
        module_dir = server_dir + "modules/" + module_name + "/"
        handle = open(module_dir + "eta.json", "r")
        config = json.loads(handle.read())
        handle.close()
        for model_dir in config["modelDirs"]:
            for root, _, files in os.walk(module_dir + model_dir):
                for filename in files:
                    if not filename.endswith(".js"):
                        continue
                    absolute_filename = root + "/" + filename
                    if not os.path.exists(absolute_filename.replace(".js", ".ts")):
                        continue
                    model_files.append(absolute_filename)
    model_files = sorted(model_files)
    db_lines = [
        "// Automatically generated by Eta v2's /scripts/generate_indexes.py",
        "import * as orm from \"typeorm\";",
        "import * as eta from \"./eta\";", ""
    ]
    init_lines = [
        "// Automatically generated by Eta v2 for server initialization",
        "// DO NOT IMPORT THIS FILE.",
        "import * as orm from \"typeorm\";",
        "import * as eta from \"./eta\";", ""
    ]
    export_lines = [
        "// Automatically generated by Eta v2's /scripts/generate_indexes.py"
    ]
    for model_file in model_files:
        handle = open(model_file, "r")
        code = handle.read()
        handle.close()
        entity_name = model_file.split("/")[-1].split(".")[0]
        path = os.path.relpath(model_file, start=server_dir)
        path = ".".join(path.split(".")[0:-1]).replace("\\", "/")
        if "// generate:ignore-file" in code:
            db_lines.append(generate_index(path, entity_name))
        else:
            db_lines.append(generate_model(path, entity_name))
            init_lines.append(generate_index(path, entity_name))
        export_file_lines = generate_export(path + ".ts")
        if "// generate:sort-first" in code:
            export_lines = export_file_lines + export_lines
        else:
            export_lines += export_file_lines
    handle = open(server_dir + "db.ts", "w")
    handle.write("\n".join(db_lines) + "\n")
    handle.close()
    handle = open(server_dir + "db-init.ts", "w")
    handle.write("\n".join(init_lines) + "\n")
    handle.close()
    export_body = "\n".join(export_lines) + "\n"
    for module_name in modules:
        js_dir = server_dir + "modules/" + module_name + "/static/js"
        if os.path.isdir(js_dir):
            handle = open(js_dir + "/db.ts", "w")
            handle.write(export_body)
            handle.close()

def handle_config(filename, use_key=True):
    if not os.path.exists(filename):
        return
    handle = open(filename, "r")
    configs = json.loads(handle.read())
    if use_key:
        configs = configs["indexes"] if "indexes" in configs else []
    handle.close()
    for config in configs:
        generate(config, os.path.dirname(filename) + "/")

def write_module_exports(module_dir):
    handle = open(module_dir + "eta.ts", "w")
    handle.write("export * from \"../../eta\";")
    handle.close()
    handle = open(module_dir + "db.ts", "w")
    handle.write("export * from \"../../db\";")
    handle.close()

def handle_module(module_dir):
    handle_config(module_dir + "eta.json")
    write_module_exports(module_dir)

def main():
    server_dir = utils.get_server_dir()
    handle_config(server_dir + "indexes.json", False)
    if os.path.isdir(server_dir + "modules"):
        modules = os.listdir(server_dir + "modules")
        for module_name in modules:
            handle_module(server_dir + "modules/" + module_name + "/")
        generate_models()
    print("Finished generating indexes and exports.")
    if len(sys.argv) > 1 and sys.argv[1] == "compile":
        print("Compiling server-side Typescript...")
        utils.compile_ts()
        # Fix client-side compilation

if __name__ == "__main__":
    main()
