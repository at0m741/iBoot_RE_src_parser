import os
import re
import dash
import dash_cytoscape as cyto
from dash import html

class FunctionCallGraph:
    def __init__(self, root_dir):
        self.root_dir = root_dir
        self.graph = {}

    def extract_function_calls(self, file_path):
        try:
            with open(file_path, "r") as file:
                content = file.read()
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return {}

        functions = re.findall(r'^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*{', content, re.MULTILINE)
        functions = [f.split('(')[0].strip() for f in functions]
        
        calls = re.findall(r'\b(?!if|else|for|while|switch|return|ASSERT|__attribute__\b)[a-zA-Z_][a-zA-Z0-9_]*\s*\(', content)
        calls = [c.split('(')[0].strip() for c in calls if c.split('(')[0].strip() not in functions]
        
        call_map = {func: [] for func in functions}
        for func in functions:
            for call in calls:
                if call != func:
                    call_map[func].append(call)
        return call_map

    def build_graph(self):
        for root, _, files in os.walk(self.root_dir):
            for file in files:
                if file.endswith(".c") or file.endswith(".h"):
                    file_path = os.path.join(root, file)
                    function_calls = self.extract_function_calls(file_path)
                    for func, calls in function_calls.items():
                        if func not in self.graph:
                            self.graph[func] = set()
                        self.graph[func].update(calls)

    def traverse_from_main(self, start_node="_main"):
        if start_node not in self.graph:
            return {}

        visited = set()
        queue = [start_node]
        subgraph = {}

        while queue:
            current = queue.pop(0)
            if current in visited:
                continue

            visited.add(current)
            if current in self.graph:
                subgraph[current] = self.graph[current]
                queue.extend(self.graph[current])

        return subgraph

    def to_cytoscape_elements(self, subgraph):
        elements = []
        for func, calls in subgraph.items():
            elements.append({"data": {"id": func, "label": func}})
            for call in calls:
                elements.append({"data": {"id": call, "label": call}})
                elements.append({"data": {"source": func, "target": call}})
        return elements

    def print_graph(self):
        for func, calls in self.graph.items():
            for call in calls:
                print(f"F: {func} -----> C: {call}") 

root_dir = "./iBoot"

graph = FunctionCallGraph(root_dir)
graph.build_graph()

graph.print_graph()

subgraph = graph.traverse_from_main("_main")
elements = graph.to_cytoscape_elements(subgraph)

app = dash.Dash(__name__)

app.layout = html.Div([
    cyto.Cytoscape(
        id='cytoscape',
        layout={'name': 'cose'},
        style={'width': '100%', 'height': '1000px'},
        elements=elements,
        zoom=1,
        minZoom=0.1,
        maxZoom=3,
        stylesheet=[
            {
                "selector": "node",
                "style": {
                    "content": "data(label)",
                    "text-valign": "center",
                    "shape": "rectangle",
                    "background-color": "#4CAF50",
                    "color": "white",
                    "padding": "10px",
                    "width": "mapData(label.length, 0, 20, 80, 300)",
                    "height": "40px",
                    "font-size": "12px",
                    "border-width": "2px",
                    "border-color": "#333",
                },
            },
            {
                "selector": "edge",
                "style": {
                    "line-color": "#0074D9",
                    "width": 2,
                    "target-arrow-shape": "triangle",
                    "target-arrow-color": "#0074D9",
                },
            },
        ],
    )
])

if __name__ == '__main__':
    app.run_server(debug=True)
