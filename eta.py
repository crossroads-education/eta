import importlib.util
import json

def main():
    args = [input()]
    while not args[-1].startswith("::eta-py "):
        args.append(input())
    script_filename = " ".join(args[-1].split(" ")[1:])
    args = args[0:-1]
    # script = importlib.import_module(script_filename)
    spec = importlib.util.spec_from_file_location("ex", script_filename)
    script = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(script)
    results = script.handle(args)
    if not isinstance(results, tuple):
        print("tupling %s" % results)
        results = (results, )
    for result in results:
        print(json.dumps(result))
    print("::eta-py end")

main()
