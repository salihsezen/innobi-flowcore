import { useState, useCallback, useRef } from 'react';
import { Node, Edge } from 'reactflow';

interface HistoryItem {
    nodes: Node[];
    edges: Edge[];
}

export function useFlowHistory(initialNodes: Node[] = [], initialEdges: Edge[] = []) {
    const [past, setPast] = useState<HistoryItem[]>([]);
    const [future, setFuture] = useState<HistoryItem[]>([]);

    // We keep track of the "current" state in the undo history independently of the React Flow state
    // This ensures we have a stable reference point
    const currentRef = useRef<HistoryItem>({ nodes: initialNodes, edges: initialEdges });

    const takeSnapshot = useCallback((nodes: Node[], edges: Edge[]) => {
        // If nothing changed from our last snapshot, ignore
        // (JSON stringify is expensive but effective for this scale)
        const current = currentRef.current;
        if (JSON.stringify(current.nodes) === JSON.stringify(nodes) &&
            JSON.stringify(current.edges) === JSON.stringify(edges)) {
            return;
        }

        setPast(old => {
            const newPast = [...old, current];
            // Limit history size to 50 steps
            if (newPast.length > 50) return newPast.slice(newPast.length - 50);
            return newPast;
        });

        currentRef.current = { nodes, edges };
        setFuture([]); // Clear future on new action
    }, []);

    const undo = useCallback(() => {
        if (past.length === 0) return null;

        const newPresent = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        setFuture(old => [currentRef.current, ...old]);
        setPast(newPast);
        currentRef.current = newPresent;

        return newPresent;
    }, [past]);

    const redo = useCallback(() => {
        if (future.length === 0) return null;

        const newPresent = future[0];
        const newFuture = future.slice(1);

        setPast(old => [...old, currentRef.current]);
        setFuture(newFuture);
        currentRef.current = newPresent;

        return newPresent;
    }, [future]);

    const clearHistory = useCallback(() => {
        setPast([]);
        setFuture([]);
    }, []);

    return {
        undo,
        redo,
        takeSnapshot,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
        clearHistory,
    };
}
