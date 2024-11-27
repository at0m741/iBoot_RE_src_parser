import os
import re

class FunctionParser:
    def __init__(self, root_dir, output_file="functions.txt"):
        self.root_dir = root_dir
        self.function_definitions = {}
        self.function_calls = {}
        self.output_file = output_file

    def parse_files(self):
        for root, _, files in os.walk(self.root_dir):
            for file in files:
                if file.endswith(".c") or file.endswith(".h"):
                    file_path = os.path.join(root, file)
                    self.extract_functions_and_calls(file_path, root, file)

    def extract_functions_and_calls(self, file_path, parent_folder, file_name):
        try:
            with open(file_path, "r") as file:
                content = file.read()
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return

        function_pattern = r'^\s*[a-zA-Z_][a-zA-Z0-9_\*]*\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*{'
        matches = re.finditer(function_pattern, content, re.MULTILINE)

        for match in matches:
            if not match:  
                continue

            start = match.start()
            open_braces = 0
            end = start
            for i, char in enumerate(content[start:], start=start):
                if char == '{':
                    open_braces += 1
                elif char == '}':
                    open_braces -= 1
                if open_braces == 0 and char == '}':
                    end = i + 1
                    break
            function_code = content[start:end].strip()

            relative_path = os.path.relpath(parent_folder, self.root_dir)
            key = f"{relative_path}/{file_name}"
            if key not in self.function_definitions:
                self.function_definitions[key] = []
            self.function_definitions[key].append(function_code)

            # Extract function name
            function_name = match.group(1).strip()
            if key not in self.function_calls:
                self.function_calls[key] = {}
            self.function_calls[key][function_name] = self.extract_calls(function_code)

    def extract_calls(self, function_code):
        call_pattern = r'\b(?!if|else|for|while|switch|return|ASSERT|__attribute__\b)[a-zA-Z_][a-zA-Z0-9_]*\s*\('
        calls = re.findall(call_pattern, function_code)
        return [call.split('(')[0].strip() for call in calls]

    def save_to_file(self):
        try:
            with open(self.output_file, "w") as file:
                current_folder = None
                for path, functions in sorted(self.function_definitions.items()):
                    folder = os.path.dirname(path)
                    if folder != current_folder:
                        current_folder = folder
                        file.write("\n" + "="*100 + f"\nFolder: {current_folder}\n" + "="*100 + "\n\n")
                    file.write(f"===========>File: {path}\n\n")
                    for definition in functions:
                        file.write(definition + "\n\n")
                    if path in self.function_calls:
                        file.write("Function Calls:\n")
                        for func, calls in self.function_calls[path].items():
                            file.write(f"  Function: {func}\n")
                            for call in calls:
                                file.write(f"    - Calls: {call}\n")
                        file.write("\n")
            print(f"Function definitions and calls written to {self.output_file}")
        except Exception as e:
            print(f"Error writing to {self.output_file}: {e}")

    def display_functions_and_calls(self):
        print("\n\nFunction Definitions and Calls\n")
        print("{path}="*100)
        for path, funcs in sorted(self.function_calls.items()):
            print(f"=============>Path: {path}")
            for func, calls in funcs.items():
                print(f"=======>Function: {func}")
                for call in calls:
                    print(f"    - Calls: {call}")


root_dir = "./iBoot"
output_file = "functions.txt"

parser = FunctionParser(root_dir, output_file)
parser.parse_files()
parser.save_to_file()
parser.display_functions_and_calls()
