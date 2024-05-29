from flask import Flask, request, jsonify, render_template, send_file
import json
import io

app = Flask(__name__)

class TreeNode:
    def __init__(self, id, name, children=None):
        self.id = id
        self.name = name
        self.children = children if children is not None else []

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'children': [child.to_dict() for child in self.children]
        }

root = None
tree = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_tree', methods=['GET'])
def get_tree():
    if root:
        return jsonify(root.to_dict())
    else:
        return jsonify({})

@app.route('/create_root', methods=['POST'])
def create_root():
    global root, tree
    root = TreeNode('1', 'Root')
    tree = {'1': root}
    return jsonify(root.to_dict())

@app.route('/add_node', methods=['POST'])
def add_node():
    parent_name = request.json.get('parent_name')
    node_name = request.json['name']
    new_id = str(len(tree) + 1)
    new_node = TreeNode(new_id, node_name)
    tree[new_id] = new_node
    
    parent_node = find_node_by_name(root, parent_name)
    if parent_node:
        parent_node.children.append(new_node)
        return jsonify(new_node.to_dict())
    else:
        tree.pop(new_id)  # remove the newly created node from tree
        return jsonify({'error': 'Parent node not found'}), 400

@app.route('/move_node', methods=['POST'])
def move_node():
    node_name = request.json['node_name']
    new_parent_name = request.json['new_parent_name']
    node = find_node_by_name(root, node_name)
    new_parent = find_node_by_name(root, new_parent_name)
    if not node:
        return jsonify({'error': 'Node to move not found'}), 400
    if not new_parent:
        return jsonify({'error': 'New parent node not found'}), 400
    
    old_parent = find_parent(root, node.id)
    if old_parent:
        old_parent.children = [child for child in old_parent.children if child.id != node.id]
    new_parent.children.append(node)
    return jsonify(node.to_dict())

@app.route('/delete_node', methods=['POST'])
def delete_node():
    global root
    node_name = request.json['node_name']
    node = find_node_by_name(root, node_name)
    if node:
        tree.pop(node.id, None)
        if node_name == 'Root':
            root = None
            tree.clear()
        else:
            parent = find_parent(root, node.id)
            if parent:
                parent.children = [child for child in parent.children if child.id != node.id]
        return jsonify({'status': 'success'})
    return jsonify({'error': 'Node not found'}), 400

@app.route('/compare_nodes', methods=['POST'])
def compare_nodes():
    node_name1 = request.json['node_name1']
    node_name2 = request.json['node_name2']
    node1 = find_node_by_name(root, node_name1)
    node2 = find_node_by_name(root, node_name2)
    if not node1 or not node2:
        return jsonify({'error': 'One or both nodes not found'}), 400
    differences = compare(node1, node2)
    return jsonify({'differences': differences})

@app.route('/load_tree', methods=['POST'])
def load_tree():
    file = request.files['file']
    data = json.load(file)
    global root, tree
    root, tree = build_tree_from_dict(data)
    return jsonify(root.to_dict())

@app.route('/save_tree', methods=['GET'])
def save_tree():
    if root:
        tree_data = root.to_dict()
        json_data = json.dumps(tree_data)
        buffer = io.BytesIO(json_data.encode('utf-8'))
        return send_file(buffer, as_attachment=True, download_name='tree.json', mimetype='application/json')
    return jsonify({'status': 'No data to save'})

def find_node_by_name(node, name):
    if node.name == name:
        return node
    for child in node.children:
        result = find_node_by_name(child, name)
        if result:
            return result
    return None

def find_parent(node, child_id):
    for child in node.children:
        if child.id == child_id:
            return node
        parent = find_parent(child, child_id)
        if parent:
            return parent
    return None

def compare(node1, node2):
    differences = []
    
    parent1 = find_parent(root, node1.id)
    parent2 = find_parent(root, node2.id)
    
    if parent1 and parent2:
        if parent1.name != parent2.name:
            differences.append(f"Different parents: {parent1.name} vs {parent2.name}")
    elif parent1 or parent2:
        differences.append("One node has a parent, the other does not")
    
    if len(node1.children) != len(node2.children):
        differences.append("Number of children differs")
    else:
        for child1, child2 in zip(node1.children, node2.children):
            differences.extend(compare(child1, child2))
    
    if not differences:
        return ["No differences"]
    
    return differences

def build_tree_from_dict(data):
    def build_node(d):
        node = TreeNode(d['id'], d['name'], [build_node(child) for child in d['children']])
        return node
    root = build_node(data)
    tree = {root.id: root}
    def add_to_tree(node):
        for child in node.children:
            tree[child.id] = child
            add_to_tree(child)
    add_to_tree(root)
    return root, tree

if __name__ == '__main__':
    app.run(debug=True)
