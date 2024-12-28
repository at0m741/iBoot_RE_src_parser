d3.json("functions.json").then(data => {
    if (!data || Object.keys(data).length === 0) {
        console.error("JSON is empty or invalid.");
        alert("The JSON file is empty or invalid. Check the contents of functions.json.");
        return;
    }

    const width = window.innerWidth * 0.8;
    const height = window.innerHeight;

    function parseData(json) {
        const nodes = [];
        const links = [];
        const nodeMap = new Map();

        for (const [folder, functions] of Object.entries(json)) {
            const folderHierarchy = folder.split('/');
            let parentId = null;

            folderHierarchy.forEach((name, index) => {
                const folderId = folderHierarchy.slice(0, index + 1).join('/');

                if (!nodeMap.has(folderId)) {
                    nodes.push({
                        id: folderId,
                        name: name,
                        type: "folder",
                        level: index
                    });
                    nodeMap.set(folderId, true);
                }

                if (parentId) {
                    links.push({ source: parentId, target: folderId });
                }
                parentId = folderId;
            });

            for (const [func, calls] of Object.entries(functions)) {
                const funcId = `${folder}/${func}`;

                if (!nodeMap.has(funcId)) {
                    nodes.push({
                        id: funcId,
                        name: func,
                        type: "function",
                        group: folder,
                        level: folderHierarchy.length
                    });
                    nodeMap.set(funcId, true);
                }

                links.push({ source: parentId, target: funcId });
            }
        }

        return { nodes, links };
    }

    function getRootFolders(json) {
        const roots = new Set();
        for (const key of Object.keys(json)) {
            const root = key.split('/')[0];
            roots.add(root);
        }
        return Array.from(roots);
    }

   
	function buildMenu(json) {
		const sidebar = d3.select("#sidebar");
		sidebar.html("").style("overflow-y", "auto").style("height", "100%");

		const searchInput = sidebar.append("input")
			.attr("type", "text")
			.attr("placeholder", "Search...")
			.style("width", "95%")
			.style("padding", "5px");

		const ul = sidebar.append("ul");

		function addMenuItems(parentUl, folderPath, depth = 0) {
			const folderName = folderPath.split('/').pop();
			const folderFunctions = json[folderPath] || {};
			const folderNode = parentUl.append("li")
				.text(folderName)
				.style("padding-left", `${depth * 15}px`)
				.on("click", (event) => {
					event.stopPropagation();
					centerGraph(folderPath);
				});

			const subFolders = Object.keys(json).filter(f => f.startsWith(folderPath + "/"));

			if (subFolders.length > 0 || Object.keys(folderFunctions).length > 0) {
				const subUl = parentUl.append("ul").style("display", "none");

				folderNode.on("click", (event) => {
					event.stopPropagation();
					const isCollapsed = subUl.style("display") === "none";
					subUl.style("display", isCollapsed ? "block" : "none");
					centerGraph(folderPath);
				});

				subFolders.forEach(subFolder => addMenuItems(subUl, subFolder, depth + 1));
				Object.entries(folderFunctions).forEach(([func, calls]) => {
					const funcNode = subUl.append("li")
						.text(func)
						.style("padding-left", `${(depth + 1) * 15}px`)
						.on("click", (event) => {
							event.stopPropagation();
							centerGraph(`${folderPath}/${func}`);
							showFunctionCalls(func, calls);
						});
				});
			}
		}

		const rootFolders = getRootFolders(json);
		rootFolders.forEach(rootFolder => {
			addMenuItems(ul, rootFolder);
		});

		searchInput.on("input", function () {
			const query = this.value.toLowerCase();
			ul.selectAll("li").style("display", function () {
				const text = d3.select(this).text().toLowerCase();
				return text.includes(query) ? "block" : "none";
			});
		});
	}

   
	function centerGraph(nodeId) {
		const node = graphData.nodes.find(n => n.id === nodeId);
		if (node) {
			d3.selectAll("circle")
				.attr("stroke", null)
				.attr("stroke-width", null);

			d3.select(`circle[id='${nodeId}']`)
				.attr("stroke", "red")
				.attr("stroke-width", 2);

			d3.select("svg g")
				.transition()
				.duration(750)
				.attr(
					"transform",
					`translate(${width / 2 - node.x}, ${height / 2 - node.y})`
				);

			const calls = graphData.nodes.find(n => n.id === nodeId && n.type === "function")?.calls || [];
			if (calls) {
				showFunctionCalls(node.name, calls);
			}
		}
	}

   
function showFunctionCalls(functionName, functionData) {
    let modalContainer = document.getElementById("modalContainer");

    if (!modalContainer) {
        modalContainer = document.createElement("div");
        modalContainer.id = "modalContainer";
        modalContainer.style.position = "fixed";
        modalContainer.style.left = "0";
        modalContainer.style.top = "0";
        modalContainer.style.width = "100%";
        modalContainer.style.height = "100%";
        modalContainer.style.background = "rgba(0, 0, 0, 0.5)";
        modalContainer.style.zIndex = "1000";
        modalContainer.style.display = "flex";
        modalContainer.style.alignItems = "center";
        modalContainer.style.justifyContent = "center";

        const modal = document.createElement("div");
        modal.id = "functionModal";
        modal.style.position = "relative";
        modal.style.width = "600px";
        modal.style.maxHeight = "80vh";
        modal.style.background = "white";
        modal.style.border = "1px solid black";
        modal.style.borderRadius = "8px";
        modal.style.padding = "20px";
        modal.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
        modal.style.overflowY = "auto";

        const closeButton = document.createElement("button");
        closeButton.textContent = "Close";
        closeButton.style.position = "absolute";
        closeButton.style.top = "10px";
        closeButton.style.right = "10px";
        closeButton.style.padding = "5px 10px";
        closeButton.style.background = "#f44336";
        closeButton.style.color = "white";
        closeButton.style.border = "none";
        closeButton.style.borderRadius = "5px";
        closeButton.style.cursor = "pointer";
        closeButton.addEventListener("click", () => {
            modalContainer.style.display = "none";
        });

        modal.appendChild(closeButton);
        modalContainer.appendChild(modal);
        document.body.appendChild(modalContainer);

        modalContainer.addEventListener("click", (event) => {
            if (event.target === modalContainer) {
                modalContainer.style.display = "none";
            }
        });
    }

    const modal = modalContainer.querySelector("#functionModal");

    modal.innerHTML = `
      <button
        style="position: absolute; top: 10px; right: 10px; padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;"
        onclick="document.getElementById('modalContainer').style.display = 'none';">
          Close
      </button>
    `;
    modal.innerHTML += `<h2>Function: ${functionName}</h2>`;

    if (functionData.documentation) {
        const doc = functionData.documentation;
        function extractSection(docString, sectionName) {
            const regex = new RegExp(
                `(?:#{1,4}\\s*|\\*\\*)\\s*${sectionName}(?:\\*{2}|\\s*:)?.*?\\n+([\\s\\S]*?)(?=\\n+\\s*(?:#{1,4}\\s*|\\*\\*)\\s*(?:Description|Parameters|Return Value|Pseudocode)|$)`,
                "i"
            );
            const match = docString.match(regex);
            if (match) {
                return match[1].trim();
            }
            return ""; 
        }

        let description = extractSection(doc, "Description");
        if (!description) {
            description = "No description available.";
        }

        let parameters = extractSection(doc, "Parameters");
        if (!parameters) {
            parameters = "No parameters listed.";
        } else {
            const lines = parameters
                .split("\n")
                .map(line => line.trim())
                .filter(line => line.length > 0);
            parameters = "<ul>" + lines.map(l => `<li>${l}</li>`).join("") + "</ul>";
        }

        let returnValue = extractSection(doc, "Return Value");
        if (!returnValue) {
            returnValue = "No return value specified.";
        }

        let pseudocode = extractSection(doc, "Pseudocode");
        if (!pseudocode) {
            pseudocode = "No pseudocode available.";
        }
        const codeBlockMatch = pseudocode.match(/```([\s\S]*?)```/);
        if (codeBlockMatch) {
            pseudocode = `<pre><code>${codeBlockMatch[1].trim()}</code></pre>`;
        } else {
            pseudocode = `<pre><code>${pseudocode}</code></pre>`;
        }

        modal.innerHTML += `
            <h3>Description</h3>
            <p>${description}</p>
            
            <h3>Parameters</h3>
            ${parameters}
            
            <h3>Return Value</h3>
            <p>${returnValue}</p>
            
            <h3>Pseudocode</h3>
            ${pseudocode}
        `;
    } else {
        modal.innerHTML += "<p>No documentation available.</p>";
    }

    const uniqueCalls = [...new Set(functionData.calls || [])];
    if (uniqueCalls.length > 0) {
        modal.innerHTML += `<h3>Calls</h3><ul>`;
        uniqueCalls.forEach(call => {
            modal.innerHTML += `<li>${call}</li>`;
        });
        modal.innerHTML += `</ul>`;
    } else {
        modal.innerHTML += `<h3>Calls</h3><p>No calls found.</p>`;
    }

    modalContainer.style.display = "flex";
}


function bringToFront(selection) {
	selection.each(function () {
		this.parentNode.appendChild(this);
	});
}

function highlightConnections(nodeId) {
	const linksToHighlight = d3.selectAll(".link")
		.classed("highlight", d => d.source.id === nodeId || d.target.id === nodeId);

	bringToFront(linksToHighlight.filter(".highlight"));

	const nodeToHighlight = d3.selectAll(`circle[id='${nodeId}']`);
	bringToFront(nodeToHighlight);
}

function resetHighlights() {
	d3.selectAll(".link").classed("highlight", false);
}

const graphData = parseData(data);

const svg = d3.select("svg")
	.call(d3.zoom().on("zoom", (event) => {
		svgGroup.attr("transform", event.transform);
	}));
const svgGroup = svg.append("g");

const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(0.06);
svg.call(d3.zoom().transform, initialTransform);

const color = d3.scaleOrdinal(d3.schemeCategory10);

const simulation = d3.forceSimulation(graphData.nodes)
	.force("link", d3.forceLink(graphData.links).id(d => d.id).distance(150))
	.force("charge", d3.forceManyBody().strength(-300))
	.force("center", d3.forceCenter(width / 2, height / 2))
	.force("collide", d3.forceCollide(40));

const link = svgGroup.append("g")
	.attr("class", "links")
	.selectAll("line")
	.data(graphData.links)
	.enter().append("line")
	.attr("class", "link")
	.attr("stroke-width", 1.0);

const node = svgGroup.append("g")
	.attr("class", "nodes")
	.selectAll("g")
	.data(graphData.nodes)
	.enter().append("g");


node.append("circle")
	.attr("r", d => (d.type === "folder" ? 20 : 10))
	.attr("fill", d => (d.type === "folder" ? "#69b3a2" : color(d.group || d.id)))
	.attr("id", d => d.id)
	.on("mouseover", (event, d) => highlightConnections(d.id))
	.on("mouseout", resetHighlights)
	.on("click", (event, d) => {
		centerGraph(d.id);
		if (d.type === "function") {
			showFunctionCalls(d.name, data[d.group]?.[d.name] || []);
		}
		else {
			return
		}
	});


node.append("text")
	.text(d => d.name)
	.attr("x", 15)
	.attr("y", 5);

simulation.on("tick", () => {
	link
		.attr("x1", d => d.source.x)
		.attr("y1", d => d.source.y)
		.attr("x2", d => d.target.x)
		.attr("y2", d => d.target.y);

	node.attr("transform", d => `translate(${d.x}, ${d.y})`);
});

buildMenu(data);

setTimeout(() => {
	simulation.stop();

	document.querySelector("#loader").style.display = "none";

	document.querySelector("#loader").style.display = "none";
}, 3000);

window.addEventListener("resize", () => {
	const newWidth = window.innerWidth * 0.8;
	const newHeight = window.innerHeight;
	svg.attr("width", newWidth).attr("height", newHeight);
	simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2));
});
}).catch(error => {
	console.error("Error loading JSON:", error);
});
