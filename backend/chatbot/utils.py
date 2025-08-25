_graph = None

def get_or_create_graph():
    global _graph

    if _graph is None:
        from .graph_module import make_graph
        _graph = make_graph()
    
    return _graph