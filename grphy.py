import json
import os
import re
import openai

class FunctionParser:
    def __init__(self, root_dir, output_file="functions.json", api_key="lol"):
        self.root_dir = root_dir
        self.function_calls = {}
        self.output_file = output_file
        openai.api_key = api_key

    def parse_files(self):
        for root, _, files in os.walk(self.root_dir):
            for file in files:
                if file.endswith(".c") :
                    file_path = os.path.join(root, file)
                    self.extract_functions_and_calls(file_path, root)

    def extract_functions_and_calls(self, file_path, parent_folder):
        try:
            with open(file_path, "r") as file:
                content = file.read()
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return

        function_pattern = r'^[a-zA-Z_][a-zA-Z0-9_\*]*\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*{' 
        matches = re.finditer(function_pattern, content, re.MULTILINE)

        relative_path = os.path.relpath(parent_folder, self.root_dir)
        if relative_path not in self.function_calls:
            self.function_calls[relative_path] = {}

        for match in matches:
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
            function_name = re.match(r'[a-zA-Z_][a-zA-Z0-9_\*]*\s+([a-zA-Z_][a-zA-Z0-9_]*)', match.group(0)).group(1)
            calls = self.extract_calls(function_code)
            documentation = self.generate_documentation(function_code)

            if function_name not in self.function_calls[relative_path]:
                self.function_calls[relative_path][function_name] = {
                    "calls": calls,
                    "documentation": documentation
                }

    def extract_calls(self, function_code):
        call_pattern = r'\b(?!if|else|for|while|switch|return|ASSERT|__attribute__\b)[a-zA-Z_][a-zA-Z0-9_]*\s*\('
        calls = re.findall(call_pattern, function_code)
        return [call.split('(')[0].strip() for call in calls]

    def generate_documentation(self, function_code):
        prompt = f"""
        Below is a C function. Please provide a concise and clear documentation for it (not in a doxygen but like a commentary for a md doc with exactly the same format for each function), including:
        - A brief description of what the function does.
        - The parameters it accepts and their purposes.
        - The return value and its meaning.
        - a quite pseudocode version (if a function is a macro (define), justify in the proto of the function)

        Function:
        {function_code}

        Documentation:
        """
        try:
            response = openai.ChatCompletion.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert assistant that generates concise documentation for C functions."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.5
            )

            result = response['choices'][0]['message']['content'].strip()
            print(f"Generated documentation for function:\n{result}")  # Print the response
            return result        
        except Exception as e:
            print(f"Error generating documentation: {e}")
            return "Documentation generation failed."

    def save_to_file(self):
        try:
            with open(self.output_file, "w") as file:
                json.dump(self.function_calls, file, indent=4)
            print(f"Function definitions and calls written to {self.output_file}")
        except Exception as e:
            print(f"Error writing to {self.output_file}: {e}")

root_dir = "../iBoot/"
output_file = "functions.json"

parser = FunctionParser(root_dir, output_file, api_key="lol")
parser.parse_files()
parser.save_to_file()
