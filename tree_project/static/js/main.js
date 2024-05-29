document.addEventListener('DOMContentLoaded', () => {
    fetch('/get_tree')
        .then(response => response.json())
        .then(data => {
            if (Object.keys(data).length === 0) {
                document.getElementById('create-root-btn').style.display = 'block';
            } else {
                renderTree(data);
            }
        });

    document.getElementById('create-root-btn').addEventListener('click', () => {
        fetch('/create_root', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('create-root-btn').style.display = 'none';
            document.getElementById('tree-container').innerHTML = ''; // Очистить дерево перед перерисовкой
            renderTree(data);
        });
    });

    document.getElementById('add-node-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const parentName = document.getElementById('parent-name').value;
        const nodeName = document.getElementById('node-name').value;
        addNode(parentName, nodeName);
    });

    document.getElementById('delete-node-btn').addEventListener('click', function() {
        const nodeName = document.getElementById('node-name-delete').value;
        deleteNode(nodeName);
    });

    document.getElementById('compare-nodes-btn').addEventListener('click', function() {
        const nodeName1 = document.getElementById('node-name1').value;
        const nodeName2 = document.getElementById('node-name2').value;
        compareNodes(nodeName1, nodeName2);
    });

    document.getElementById('move-node-btn').addEventListener('click', function() {
        const nodeName = document.getElementById('node-name-move').value;
        const newParentName = document.getElementById('new-parent-name').value;
        moveNode(nodeName, newParentName);
    });

    document.getElementById('load-tree-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const fileInput = document.getElementById('tree-file');
        loadTree(fileInput.files[0]);
    });

    document.getElementById('save-tree-btn').addEventListener('click', function() {
        saveTree();
    });

    document.getElementById('toggle-all-btn').addEventListener('click', function() {
        toggleAllNodes();
    });

    document.getElementById('expand-all-btn').addEventListener('click', function() {
        expandAllNodes();
    });
});

function renderTree(treeData) {
    const treeContainer = document.getElementById('tree-container');
    treeContainer.innerHTML = '';

    const width = 800;
    const height = 600;

    const svg = d3.select('#tree-container').append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', 'translate(50, 50)');

    const root = d3.hierarchy(treeData);

    const treeLayout = d3.tree().size([width - 100, height - 100]);
    treeLayout(root);

    const nodes = root.descendants();
    const links = root.links();

    svg.selectAll('.link')
        .data(links)
        .enter()
        .append('line')
        .attr('class', 'link')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
        .attr('stroke', '#ccc');

    const nodeElements = svg.selectAll('.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x}, ${d.y})`)
        .on('click', (event, d) => {
            toggleNode(d);
            renderTree(root.data);
        });

    nodeElements.append('circle')
        .attr('r', 10)
        .attr('fill', '#fff')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', '2');

    nodeElements.append('text')
        .attr('dy', -10)
        .attr('x', d => d.children ? -12 : 12)
        .attr('text-anchor', d => d.children ? 'end' : 'start')
        .text(d => d.data.name);
}

function addNode(parentName, nodeName) {
    fetch('/add_node', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parent_name: parentName, name: nodeName })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            location.reload();
        }
    });
}

function deleteNode(nodeName) {
    fetch('/delete_node', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ node_name: nodeName })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            if (nodeName === 'Root') {
                // Если удаляется корневой узел, вернуть кнопку создания корня
                document.getElementById('create-root-btn').style.display = 'block';
            }
            location.reload();
        }
    });
}

function compareNodes(nodeName1, nodeName2) {
    fetch('/compare_nodes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ node_name1: nodeName1, node_name2: nodeName2 })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            alert('Differences: ' + data.differences.join(', '));
        }
    });
}

function moveNode(nodeName, newParentName) {
    fetch('/move_node', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ node_name: nodeName, new_parent_name: newParentName })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            location.reload();
        }
    });
}

function loadTree(file) {
    const formData = new FormData();
    formData.append('file', file);

    fetch('/load_tree', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        location.reload();
    });
}

function saveTree() {
    fetch('/save_tree', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'tree.json';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    });
}

function toggleNode(node) {
    if (node.children) {
        node._children = node.children;
        node.children = null;
    } else {
        node.children = node._children;
        node._children = null;
    }
}

function toggleAllNodes() {
    fetch('/get_tree')
        .then(response => response.json())
        .then(data => {
            if (Object.keys(data).length !== 0) {
                toggleAll(data);
                renderTree(data);
            }
        });
}

function toggleAll(node) {
    if (node.children) {
        node._children = node.children;
        node.children = null;
    } else if (node._children) {
        node.children = node._children;
        node._children = null;
    }

    if (node.children) {
        node.children.forEach(toggleAll);
    } else if (node._children) {
        node._children.forEach(toggleAll);
    }
}

function expandAllNodes() {
    fetch('/get_tree')
        .then(response => response.json())
        .then(data => {
            if (Object.keys(data).length !== 0) {
                expandAll(data);
                renderTree(data);
            }
        });
}

function expandAll(node) {
    if (node._children) {
        node.children = node._children;
        node._children = null;
    }

    if (node.children) {
        node.children.forEach(expandAll);
    }
}
