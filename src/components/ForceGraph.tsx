"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3-force';
import * as d3Drag from 'd3-drag';
import * as d3Selection from 'd3-selection';

export type NodeType = 'root' | 'category' | 'experience' | 'project' | 'skill' | 'education';

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: NodeType;
  label: string;
  group: number;
  radius: number;
  data?: any;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
}

interface ForceGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick: (node: GraphNode) => void;
}

export function ForceGraph({ nodes: initialNodes, links: initialLinks, onNodeClick }: ForceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  const dragRef = useRef<d3Drag.DragBehavior<HTMLDivElement, GraphNode, unknown> | null>(null);

  useEffect(() => {
    dragRef.current = d3Drag.drag<HTMLDivElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulationRef.current?.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulationRef.current?.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }, []);

  const setNodeRef = useCallback((el: HTMLDivElement | null, node: GraphNode) => {
    if (el && dragRef.current) {
      const selection = d3Selection.select(el);
      selection.datum(node);
      selection.call(dragRef.current as any);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const d3Nodes = initialNodes.map(d => ({ ...d }));
    const d3Links = initialLinks.map(d => ({ ...d }));

    const simulation = d3.forceSimulation<GraphNode>(d3Nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(d3Links).id(d => d.id).distance(140).strength(0.8))
      .force('charge', d3.forceManyBody().strength(-600))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide<GraphNode>().radius(d => d.radius + 20).iterations(2))
      .on('tick', () => {
        setNodes([...d3Nodes]);
        setLinks([...d3Links]);
      });

    simulationRef.current = simulation;

    const handleResize = () => {
      if (containerRef.current) {
        simulation.force('center', d3.forceCenter(containerRef.current.clientWidth / 2, containerRef.current.clientHeight / 2));
        simulation.alpha(0.3).restart();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      simulation.stop();
      window.removeEventListener('resize', handleResize);
    };
  }, [initialNodes, initialLinks]);

  const handleClick = (e: React.MouseEvent, node: GraphNode) => {
    if (e.defaultPrevented) return;
    const isLeaf = !['root', 'category'].includes(node.type);
    if (isLeaf) onNodeClick(node);
  };

  const getColor = (type: NodeType) => {
    switch (type) {
      case 'root': return 'var(--accent)';
      case 'category': return 'var(--accent-2)';
      case 'experience': return 'var(--accent-3)';
      case 'project': return '#f59e0b';
      case 'skill': return '#10b981';
      case 'education': return '#8b5cf6';
      default: return 'var(--fg)';
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-transparent cursor-grab active:cursor-grabbing">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {links.map((link, i) => {
          const source = link.source as GraphNode;
          const target = link.target as GraphNode;
          if (source.x == null || source.y == null || target.x == null || target.y == null) return null;
          return (
            <line
              key={i}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="var(--border-strong)"
              strokeWidth={1.5}
              opacity={0.4}
            />
          );
        })}
      </svg>

      {nodes.map((node) => {
        if (node.x == null || node.y == null) return null;
        const color = getColor(node.type);
        const isLeaf = !['root', 'category'].includes(node.type);
        
        return (
          <div
            key={node.id}
            ref={(el) => setNodeRef(el, node)}
            onClick={(e) => handleClick(e, node)}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-colors group"
            style={{
              left: node.x,
              top: node.y,
              width: node.radius * 2,
              height: node.radius * 2,
              backgroundColor: isLeaf ? 'var(--bg-elev)' : color,
              border: `2px solid ${color}`,
              boxShadow: `0 0 15px ${color}40`,
              cursor: isLeaf ? 'pointer' : 'grab',
              zIndex: isLeaf ? 10 : 5,
            }}
          >
            {node.type === 'root' ? (
              <span className="font-bold text-white tracking-widest text-sm drop-shadow-md select-none pointer-events-none">BEN</span>
            ) : node.type === 'category' ? (
              <span className="font-bold text-white text-[9px] uppercase tracking-wider drop-shadow-md select-none pointer-events-none">{node.label}</span>
            ) : (
               <span className="w-2.5 h-2.5 rounded-full pointer-events-none transition-transform group-hover:scale-150" style={{ backgroundColor: color }}></span>
            )}
            
            {isLeaf && (
              <div className="absolute top-full mt-3 w-max max-w-[180px] text-center pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                 <div className="mono text-[10px] text-[color:var(--fg)] px-2.5 py-1.5 bg-[color:var(--bg-elev)]/90 backdrop-blur-md rounded-sm border border-[color:var(--border)] whitespace-normal leading-tight">
                   {node.label}
                 </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}