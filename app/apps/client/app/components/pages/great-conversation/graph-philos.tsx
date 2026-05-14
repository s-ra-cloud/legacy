import { useEffect, useRef } from "react";
import * as d3 from "d3";

// Sample data structure - you can replace this with your actual data
interface Node {
  id: string;
  name: string;
}

type LinkType = "agreement" | "opposition" | "neutral";

interface Link {
  source: string | Node;
  target: string | Node;
  type?: LinkType;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

export default function GraphPhilos({ vnodes, vlinks }: { vnodes: Node[], vlinks: Link[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Sample data - replace with your actual data source
    const data: GraphData = {
      nodes: vnodes,
      links: vlinks,
    };

    const height = 600;
    const margin = { top: 80, right: 60, bottom: 30, left: 60 };
    const minNodeSpacing = 100;

    // Color mapping for link types
    const getLinkColor = (type: LinkType = "neutral"): string => {
      switch (type) {
        case "agreement":
          return "#22c55e"; // green
        case "opposition":
          return "#f97316"; // orange
        case "neutral":
        default:
          return "#E3DBDC"; // white/neutral
      }
    };

    // Function to render the graph
    const renderGraph = () => {
      if (!svgRef.current || !containerRef.current) return;

      // Clear previous render
      d3.select(svgRef.current).selectAll("*").remove();

      const svg = d3.select(svgRef.current);
      // Get container width - ensure we get the actual visible width
      const containerWidth = Math.max(
        containerRef.current.clientWidth || 0,
        containerRef.current.offsetWidth || 0,
        window.innerWidth || 1200
      );

      // Calculate minimum width based on number of nodes
      const minRequiredWidth = data.nodes.length * minNodeSpacing + margin.left + margin.right;

      // Always use minimum required width if it's larger than container
      // This ensures scrolling when there are many nodes
      const width = Math.max(containerWidth, minRequiredWidth);

      // Set explicit width and height on SVG (both attribute and style)
      svgRef.current.setAttribute("width", width.toString());
      svgRef.current.setAttribute("height", height.toString());
      svgRef.current.style.width = `${width}px`;
      svgRef.current.style.height = `${height}px`;

      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;

      // Create a map for quick node lookup
      const nodeMap = new Map(data.nodes.map((d) => [d.id, d]));

      // Resolve links to node objects and preserve type
      const links = data.links.map((d) => ({
        source: typeof d.source === "string" ? nodeMap.get(d.source)! : d.source,
        target: typeof d.target === "string" ? nodeMap.get(d.target)! : d.target,
        type: d.type || "neutral" as LinkType,
      }));

      // Create scale for positioning nodes along the x-axis
      const xScale = d3
        .scalePoint()
        .domain(data.nodes.map((d) => d.id))
        .range([0, chartWidth])
        .padding(0.1);

      // Function to create arc path between two nodes
      function arcPath(d: { source: Node; target: Node; type: LinkType }) {
        const x1 = xScale(d.source.id)!;
        const x2 = xScale(d.target.id)!;
        const centerY = chartHeight / 2;
        const dx = Math.abs(x2 - x1);

        // Determine arc direction based on link type
        // Green (agreement) and white (neutral) go above, orange (opposition) goes below
        // Make arc height proportional to distance between nodes (30% of distance)
        const arcHeight = dx * 0.3;
        const isOpposition = d.type === "opposition";
        const controlY = isOpposition ? centerY + arcHeight : centerY - arcHeight;
        const controlX = (x1 + x2) / 2; // Control point at midpoint horizontally

        // Use quadratic bezier curve for smooth arcs
        return `M${x1},${centerY}Q${controlX},${controlY} ${x2},${centerY}`;
      }

      // Draw links (arcs)
      const link = g
        .append("g")
        .attr("class", "links")
        .selectAll("path")
        .data(links)
        .join("path")
        .attr("d", arcPath)
        .attr("fill", "none")
        .attr("stroke", (d) => getLinkColor(d.type))
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.6);

      // Draw nodes
      const node = g
        .append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(data.nodes)
        .join("g")
        .attr("transform", (d) => `translate(${xScale(d.id)},${chartHeight / 2})`)
        .attr("class", "node");

      // Add circles for nodes
      node
        .append("circle")
        .attr("r", 6)
        .attr("fill", "#E3DBDC")
        .attr("stroke", "#E3DBDC")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          // Highlight connected links
          link.attr("opacity", (l) => {
            return l.source === d || l.target === d ? 1 : 0.1;
          });

          // Highlight connected nodes
          node.select("circle").attr("opacity", (n) => {
            const isConnected =
              links.some(
                (l) =>
                  (l.source === d && l.target === n) ||
                  (l.target === d && l.source === n)
              ) || n === d;
            return isConnected ? 1 : 0.3;
          });

          // Make the hovered philosopher's name bold and bigger
          node.filter((n) => n === d).select("text")
            .attr("font-weight", "bold")
            .attr("font-size", "18px");

          d3.select(this).attr("r", 8);
        })
        .on("mouseout", function () {
          link.attr("opacity", (l) => {
            // Restore original opacity based on link type
            return 0.6;
          });
          node.select("circle").attr("opacity", 1).attr("r", 6);

          // Remove bold and restore font size from all names
          node.select("text")
            .attr("font-weight", "normal")
            .attr("font-size", "15px");
        });

      // Add labels for nodes
      node
        .append("text")
        .attr("dy", -12)
        .attr("text-anchor", "middle")
        .attr("fill", "#ccdaeb")
        .attr("font-size", "15px")
        .attr("font-family", "serif")
        .attr("transform", "rotate(-45)")
        .text((d) => d.name)
        .style("pointer-events", "none");
    };

    // Initial render - use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      renderGraph();
    });

    // Handle window resize
    const resizeObserver = new ResizeObserver(() => {
      renderGraph();
    });
    resizeObserver.observe(containerRef.current);

    // Cleanup function
    return () => {
      resizeObserver.disconnect();
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove();
      }
    };
  }, []);

  return (
    <section className="w-full text-[#E3DBDC] text-center px-4">
      {/* <h1 className="text-[35px] font-serif font-bold mb-8 tracking-wide">
        Great Conversation Graph
      </h1> */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto"
      >
        <svg
          ref={svgRef}
          style={{ minHeight: "600px", display: "block" }}
        />
      </div>
    </section>
  );
}