import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function TestingPage() {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return;
    const svg = d3.select(ref.current);
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Clear any previous drawings
    svg.selectAll('*').remove();
    svg.attr('viewBox', [-width / 2, -height / 2, width, height]);

    d3.json('/flare.json').then((raw: any) => {
      const rootsArray = Array.isArray(raw) ? raw : [raw];

      const nodes: any[] = [];
      const links: any[] = [];
      const hierarchies: any[] = [];

      // Process each root and store hierarchies
      for (let rootIndex = 0; rootIndex < rootsArray.length; rootIndex++) {
        const r = rootsArray[rootIndex];
        const h = d3
          .hierarchy(r)
          .sum((d: any) => d.value || d.size || 0)
          .sort((a, b) => (b.value || 0) - (a.value || 0));

        // Store root index on each node
        h.each((node: any) => {
          node.rootIndex = rootIndex;
        });

        hierarchies.push(h);
        nodes.push(...h.descendants());
        links.push(...h.links());
      }

      // Calculate starting positions for each root tree
      const rootPositions: Array<{ x: number; y: number }> = [];
      const numRoots = hierarchies.length;

      if (numRoots === 1) {
        // Single root: center it
        rootPositions.push({ x: 0, y: 0 });
      } else {
        // Multiple roots: spread them out in a grid or circular pattern
        const cols = Math.ceil(Math.sqrt(numRoots));
        const rows = Math.ceil(numRoots / cols);
        const spacingX = width / (cols + 1);
        const spacingY = height / (rows + 1);

        for (let i = 0; i < numRoots; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          rootPositions.push({
            x: (col + 1) * spacingX - width / 2,
            y: (row + 1) * spacingY - height / 2,
          });
        }
      }

      // Set initial x,y positions for nodes based on their root position
      nodes.forEach((node: any) => {
        const rootIndex = node.rootIndex || 0;
        const rootPos = rootPositions[rootIndex];
        if (!rootPos) {
          node.x = 0;
          node.y = 0;
          return;
        }

        if (node.depth === 0) {
          // Root node: position at root location
          node.x = rootPos.x;
          node.y = rootPos.y;
        } else {
          // Child nodes: position randomly around their root with some spread
          const spread = 100; // Distance to spread children from root
          node.x = rootPos.x + (Math.random() - 0.5) * spread;
          node.y = rootPos.y + (Math.random() - 0.5) * spread;
        }
      });

      const g = svg.append('g');

      svg.call(
        // Cast to any to avoid strict generic conflicts
        (d3
          .zoom()
          .on('zoom', (event: any) => {
            g.attr('transform', event.transform.toString());
          }) as any)
      );

      const link = g
        .append('g')
        .attr('stroke', '#fff')
        .attr('stroke-opacity', 0.4)
        .selectAll('line')
        .data(links)
        .join('line');

      // Node styling similar to Observable example (white internal nodes, black leaves)
      const node = g
        .append('g')
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', 6)
        .attr('fill', (d: any) => (d.children ? '#000' : '#fff'))
        .attr('stroke', '#000')
        .attr('stroke-width', 1.5)
        .call(
          (d3
            .drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended) as any)
        );

      // Create per-root force centers for multiple roots
      const forceX = d3.forceX((d: any) => {
        const rootIndex = d.rootIndex || 0;
        const rootPos = rootPositions[rootIndex];
        return rootPos ? rootPos.x : 0;
      });
      const forceY = d3.forceY((d: any) => {
        const rootIndex = d.rootIndex || 0;
        const rootPos = rootPositions[rootIndex];
        return rootPos ? rootPos.y : 0;
      });

      const simulation = d3
        .forceSimulation(nodes as any)
        .force('link', d3.forceLink(links).id((d: any) => d.index).distance(20).strength(1))
        .force('charge', d3.forceManyBody().strength(-140))
        .force('collision', d3.forceCollide().radius(15).strength(0))
        .force('x', forceX)
        .force('y', forceY)
        .on('tick', ticked);

      function ticked() {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
      }

      function dragstarted(event: any, d: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event: any, d: any) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event: any, d: any) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

      // Cleanup when component unmounts
      return () => simulation.stop();
    });
  }, []);

  return (
    <div className="bg-[#E2DCDC] w-screen h-screen">
      <svg ref={ref} className="w-full h-full" />
    </div>
  );
}

export const handle = {
  breadcrumb: () => 'Testing',
};
