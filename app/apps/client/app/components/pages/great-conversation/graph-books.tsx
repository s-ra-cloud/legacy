import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  author?: string;
  date?: string;
}

type LinkType = "agreement" | "opposition" | "neutral";

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  value?: number;
  type?: LinkType;
}

// Mock data for books graph
// const mockNodes: Node[] = [
//   { id: "1", name: "The Republic", author: "Plato", date: "c. 380 BCE" },
//   { id: "2", name: "Nicomachean Ethics", author: "Aristotle", date: "c. 350 BCE" },
//   { id: "3", name: "Meditations", author: "Marcus Aurelius", date: "c. 180 CE" },
//   { id: "4", name: "Confessions", author: "Augustine", date: "c. 400 CE" },
//   { id: "5", name: "Summa Theologica", author: "Thomas Aquinas", date: "1265-1274" },
//   { id: "6", name: "The Prince", author: "Niccolò Machiavelli", date: "1532" },
//   { id: "7", name: "Leviathan", author: "Thomas Hobbes", date: "1651" },
//   { id: "8", name: "Critique of Pure Reason", author: "Immanuel Kant", date: "1781" },
//   { id: "9", name: "Beyond Good and Evil", author: "Friedrich Nietzsche", date: "1886" },
//   { id: "10", name: "Being and Time", author: "Martin Heidegger", date: "1927" },
//   { id: "11", name: "The Art of War", author: "Sun Tzu", date: "c. 5th century BCE" },
//   { id: "12", name: "The Art of Living", author: "Seneca", date: "c. 5th century BCE" },
//   { id: "13", name: "The Art of Thinking Clearly", author: "Hans-Georg Gadamer", date: "c. 5th century BCE" },
// ];

// const mockLinks: Link[] = [
//   { source: "1", target: "2", value: 1, type: "agreement" },
//   { source: "2", target: "3", value: 1, type: "neutral" },
//   { source: "3", target: "4", value: 1, type: "neutral" },
//   { source: "4", target: "5", value: 1, type: "agreement" },
//   { source: "5", target: "6", value: 1, type: "neutral" },
//   { source: "6", target: "7", value: 1, type: "agreement" },
//   { source: "7", target: "8", value: 1, type: "opposition" },
//   { source: "8", target: "9", value: 1, type: "opposition" },
//   { source: "9", target: "10", value: 1, type: "neutral" },
//   { source: "1", target: "5", value: 1, type: "agreement" },
//   { source: "2", target: "8", value: 1, type: "opposition" },
//   { source: "3", target: "10", value: 1, type: "neutral" },
//   { source: "12", target: "13", value: 1, type: "neutral" },
//   { source: "11", target: "13", value: 1, type: "agreement" },
// ];

export default function GraphBooks({ vnodes, vlinks }: { vnodes: Node[], vlinks: Link[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const containerWidth = Math.max(
      containerRef.current.clientWidth || 0,
      containerRef.current.offsetWidth || 0,
      960
    );
    const containerHeight = 600;

    // Initial dimensions - will be dynamically adjusted
    const nodeRadius = 55;
    const padding = 100; // Padding around nodes
    const initialWidth = Math.max(containerWidth, 1200);
    const initialHeight = Math.max(containerHeight, 800);

    let currentWidth = initialWidth;
    let currentHeight = initialHeight;

    // Clear previous render
    d3.select(svgRef.current).selectAll("*").remove();

    // Set initial SVG dimensions with viewBox
    svgRef.current.setAttribute("width", currentWidth.toString());
    svgRef.current.setAttribute("height", currentHeight.toString());
    svgRef.current.setAttribute("viewBox", `0 0 ${currentWidth} ${currentHeight}`);
    svgRef.current.style.width = `${currentWidth}px`;
    svgRef.current.style.height = `${currentHeight}px`;

    const svg = d3.select(svgRef.current);

    // Create a map for quick node lookup
    const nodeMap = new Map(vnodes.map((d) => [d.id, d]));

    // Color mapping for link types
    const getLinkColor = (type: LinkType = "neutral"): string => {
      switch (type) {
        case "agreement":
          return "#22c55e"; // green
        case "opposition":
          return "#f97316"; // orange
        case "neutral":
        default:
          return "#94A3B8"; // slate/neutral
      }
    };

    // Resolve links to node objects and preserve type
    const links = vlinks.map((d) => ({
      source: typeof d.source === "string" ? nodeMap.get(d.source)! : d.source,
      target: typeof d.target === "string" ? nodeMap.get(d.target)! : d.target,
      value: d.value || 1,
      type: d.type || "neutral" as LinkType,
    }));

    // Create force simulation
    const simulation = d3
      .forceSimulation(vnodes)
      .force(
        "link",
        d3.forceLink(links).id((d: any) => d.id).distance(250)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(currentWidth / 2, currentHeight / 2))
      .force("collision", d3.forceCollide().radius(60));

    // Function to update SVG dimensions based on node positions
    let lastUpdateTime = 0;
    const updateSVGDimensions = () => {
      if (!svgRef.current || vnodes.length === 0) return;

      // Throttle updates slightly to avoid performance issues
      const now = Date.now();
      if (now - lastUpdateTime < 50) return; // Update at most every 50ms
      lastUpdateTime = now;

      // Find bounds of all nodes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      vnodes.forEach((node) => {
        if (node.x !== undefined && node.y !== undefined) {
          minX = Math.min(minX, node.x - nodeRadius);
          minY = Math.min(minY, node.y - nodeRadius);
          maxX = Math.max(maxX, node.x + nodeRadius);
          maxY = Math.max(maxY, node.y + nodeRadius);
        }
      });

      // If we have valid bounds, update SVG size
      if (isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
        // Calculate bounds with padding
        const boundsWidth = maxX - minX;
        const boundsHeight = maxY - minY;
        const viewBoxX = minX - padding;
        const viewBoxY = minY - padding;
        const viewBoxWidth = boundsWidth + padding * 2;
        const viewBoxHeight = boundsHeight + padding * 2;

        // Calculate display dimensions (ensure minimum size)
        const newWidth = Math.max(initialWidth, viewBoxWidth);
        const newHeight = Math.max(initialHeight, viewBoxHeight);

        // Check if update is needed - update if any node is outside current bounds
        const currentViewBoxX = parseFloat(svgRef.current.getAttribute("viewBox")?.split(" ")[0] || "0");
        const currentViewBoxY = parseFloat(svgRef.current.getAttribute("viewBox")?.split(" ")[1] || "0");
        const currentViewBoxWidth = parseFloat(svgRef.current.getAttribute("viewBox")?.split(" ")[2] || currentWidth.toString());
        const currentViewBoxHeight = parseFloat(svgRef.current.getAttribute("viewBox")?.split(" ")[3] || currentHeight.toString());

        const needsUpdate =
          minX < currentViewBoxX + padding ||
          minY < currentViewBoxY + padding ||
          maxX > currentViewBoxX + currentViewBoxWidth - padding ||
          maxY > currentViewBoxY + currentViewBoxHeight - padding ||
          Math.abs(newWidth - currentWidth) > 50 ||
          Math.abs(newHeight - currentHeight) > 50;

        if (needsUpdate) {
          currentWidth = newWidth;
          currentHeight = newHeight;

          // Update SVG with viewBox to handle any coordinate system (including negative)
          svgRef.current.setAttribute("width", currentWidth.toString());
          svgRef.current.setAttribute("height", currentHeight.toString());
          svgRef.current.setAttribute("viewBox", `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
          svgRef.current.style.width = `${currentWidth}px`;
          svgRef.current.style.height = `${currentHeight}px`;
          svgRef.current.style.minWidth = `${currentWidth}px`;
          svgRef.current.style.minHeight = `${currentHeight}px`;
        }
      }
    };

    // Create drag behavior
    function drag(simulation: d3.Simulation<Node, undefined>) {
      function dragstarted(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
        // Update SVG dimensions when dragging to ensure node stays visible
        updateSVGDimensions();
      }

      function dragended(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3
        .drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    // Draw links
    const link = svg
      .append("g")
      .attr("class", "links")
      .selectAll<SVGLineElement, typeof links[0]>("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => getLinkColor(d.type))
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 3);

    // Draw nodes as groups (circle + text)
    const node = svg
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, Node>("g")
      .data(vnodes)
      .join("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(drag(simulation) as any);

    // Add circles to nodes
    const circle = node
      .append("circle")
      .attr("r", 55)
      .attr("fill", "#1a1918")
      .attr("stroke", "#94A3B8")
      .attr("stroke-width", 2);

    // Function to wrap text into multiple lines
    const wrapText = (textElement: d3.Selection<SVGTextElement, unknown, null, undefined>, text: string, maxWidth: number, fontSize: number) => {
      const words = text.split(/\s+/).filter(w => w.length > 0);
      if (words.length === 0) return [""];

      const lines: string[] = [];
      let currentLine = words[0]!;

      // Create a temporary text element to measure width
      const tempText = textElement.append("tspan").style("visibility", "hidden");

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        if (!word) continue;

        const testLine = currentLine + " " + word;
        tempText.text(testLine);
        const testWidth = tempText.node()?.getComputedTextLength() || 0;

        if (testWidth > maxWidth && currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      // Remove temporary element
      tempText.remove();

      return lines;
    };

    // Add text labels inside circles with multi-line support
    const label = node
      .append("text")
      .attr("font-size", "12px")
      .attr("font-family", "sans-serif")
      .attr("fill", "#EAE8E4")
      .attr("text-anchor", "middle")
      .style("pointer-events", "none")
      .style("user-select", "none")
      .each(function (d) {
        const textElement = d3.select(this);
        const maxWidth = 95; // Max width for text (circle radius * 2 - padding)
        const fontSize = 12;
        const smallFontSize = 10;
        const lineHeight = fontSize * 1.2;
        const smallLineHeight = smallFontSize * 1.2;

        // Wrap name into lines
        const nameLines = wrapText(textElement, d.name, maxWidth, fontSize);

        // Prepare all text lines: name, author, date
        const allLines: Array<{ text: string; fontSize: number; isItalic?: boolean }> = [];

        // Add name lines
        nameLines.forEach(line => {
          allLines.push({ text: line, fontSize });
        });

        // Add author if available
        if (d.author) {
          allLines.push({ text: d.author, fontSize: smallFontSize, isItalic: true });
        }

        // Add date if available
        if (d.date) {
          allLines.push({ text: d.date, fontSize: smallFontSize });
        }

        // Create tspans for each line
        const tspans = textElement
          .selectAll("tspan")
          .data(allLines)
          .join("tspan")
          .text((d) => d.text)
          .attr("x", 0)
          .attr("font-size", (d) => `${d.fontSize}px`)
          .attr("font-style", (d) => d.isItalic ? "italic" : "normal")
          .attr("dy", (d, i) => {
            if (i === 0) return "0";
            const prevLine = allLines[i - 1]!;
            return prevLine.fontSize === fontSize ? lineHeight : smallLineHeight;
          })
          .attr("text-anchor", "middle");

        // Center text vertically by adjusting the first line's dy
        let totalHeight = 0;
        allLines.forEach((line, i) => {
          if (i === 0) {
            totalHeight += line.fontSize * 1.2;
          } else {
            const prevLine = allLines[i - 1]!;
            totalHeight += prevLine.fontSize === fontSize ? lineHeight : smallLineHeight;
          }
        });
        const firstLineDy = -totalHeight / 2 + fontSize * 1.2 / 2;
        tspans.filter((d, i) => i === 0).attr("dy", firstLineDy);
      });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as Node).x!)
        .attr("y1", (d) => (d.source as Node).y!)
        .attr("x2", (d) => (d.target as Node).x!)
        .attr("y2", (d) => (d.target as Node).y!);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);

      // Update SVG dimensions to ensure all nodes are visible
      updateSVGDimensions();
    });

    // Add hover effects
    node
      .on("mouseover", function (event, d) {
        // Highlight connected links
        link.attr("stroke-opacity", (l) => {
          return l.source === d || l.target === d ? 1 : 0.1;
        });

        // Highlight connected nodes
        node.attr("opacity", (n) => {
          const isConnected =
            links.some(
              (l) =>
                (l.source === d && l.target === n) ||
                (l.target === d && l.source === n)
            ) || n === d;
          return isConnected ? 1 : 0.3;
        });

        // Scale up the hovered node
        d3.select(this).select("circle").attr("r", 60);
      })
      .on("mouseout", function () {
        link.attr("stroke-opacity", 0.6);
        node.attr("opacity", 1);
        node.select("circle").attr("r", 55);
      });

    // Cleanup
    return () => {
      simulation.stop();
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove();
      }
    };
  }, []);

  return (
    <section className="w-full text-ivory text-center">

      <div
        ref={containerRef}
        className="w-full overflow-auto"
        style={{ height: "80vh", width: "100%" }}
      >
        <svg
          ref={svgRef}
          style={{ display: "block" }}
        />
      </div>
    </section>
  );
}