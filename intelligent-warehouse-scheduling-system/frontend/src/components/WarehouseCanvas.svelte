<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import * as d3 from 'd3';
  import type { Rack, Robot, Location } from '../types';

  export let racks: Rack[] = [];
  export let robots: Robot[] = [];
  export let locations: Location[] = [];
  export let floorWidth: number = 50;
  export let floorHeight: number = 40;
  export let selectedLocation: Location | null = null;
  export let onLocationSelect: (location: Location | null) => void = () => {};
  export let onRackMove: (rackId: string, x: number, y: number) => void = () => {};

  let container: HTMLDivElement;
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>;
  let g: d3.Selection<SVGGElement, unknown, null, undefined>;
  let cellSize = 20;
  let isDragging = false;
  let draggedRack: Rack | null = null;

  $: {
    if (svg && racks.length > 0) {
      render();
    }
  }

  onMount(async () => {
    await tick();
    initCanvas();
    render();
  });

  onDestroy(() => {
    if (svg) {
      svg.selectAll('*').remove();
    }
  });

  function initCanvas(): void {
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);

    zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        if (!isDragging) {
          g.attr('transform', event.transform);
        }
      });

    svg.call(zoomBehavior);

    g = svg.append('g');

    svg.on('click', (event) => {
      if (event.target === svg.node() || event.target.tagName === 'rect') {
        if (!isDragging) {
          onLocationSelect(null);
        }
      }
    });
  }

  function render(): void {
    if (!g) return;

    g.selectAll('*').remove();

    const width = container.clientWidth;
    const height = container.clientHeight;

    cellSize = Math.min(width / floorWidth, height / floorHeight) * 0.9;
    const offsetX = (width - floorWidth * cellSize) / 2;
    const offsetY = (height - floorHeight * cellSize) / 2;

    const gridGroup = g.append('g').attr('transform', `translate(${offsetX}, ${offsetY})`);

    for (let i = 0; i <= floorWidth; i++) {
      gridGroup
        .append('line')
        .attr('x1', i * cellSize)
        .attr('y1', 0)
        .attr('x2', i * cellSize)
        .attr('y2', floorHeight * cellSize)
        .attr('stroke', '#e0e0e0')
        .attr('stroke-width', 0.5);
    }

    for (let i = 0; i <= floorHeight; i++) {
      gridGroup
        .append('line')
        .attr('x1', 0)
        .attr('y1', i * cellSize)
        .attr('x2', floorWidth * cellSize)
        .attr('y2', i * cellSize)
        .attr('stroke', '#e0e0e0')
        .attr('stroke-width', 0.5);
    }

    const rackGroup = gridGroup.append('g');

    rackGroup
      .selectAll('.rack')
      .data(racks, (d: any) => d.id)
      .enter()
      .append('g')
      .attr('class', 'rack')
      .attr('transform', (d) => `translate(${d.x * cellSize}, ${d.y * cellSize})`)
      .each(function (d) {
        const rack = d3.select(this);

        rack
          .append('rect')
          .attr('width', d.width * cellSize - 2)
          .attr('height', d.height * cellSize - 2)
          .attr('x', 1)
          .attr('y', 1)
          .attr('fill', '#4a90d9')
          .attr('stroke', '#2563eb')
          .attr('stroke-width', 2)
          .attr('rx', 4)
          .style('cursor', 'move');

        rack
          .append('text')
          .attr('x', (d.width * cellSize) / 2)
          .attr('y', (d.height * cellSize) / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', 'white')
          .attr('font-size', `${Math.min(cellSize * 0.8, 14)}px`)
          .attr('font-weight', 'bold')
          .text(d.name);

        const rackLocations = locations.filter((l) => l.rackId === d.id);
        rackLocations.forEach((loc) => {
          const locX = loc.column * (cellSize / d.columns);
          const locY = loc.row * (cellSize / d.rows);
          const fillColor =
            loc.status === 'occupied'
              ? '#22c55e'
              : loc.status === 'reserved'
                ? '#f59e0b'
                : loc.status === 'blocked'
                  ? '#ef4444'
                  : '#d1d5db';

          rack
            .append('rect')
            .attr('x', locX + 2)
            .attr('y', locY + 2)
            .attr('width', cellSize / d.columns - 4)
            .attr('height', cellSize / d.rows - 4)
            .attr('fill', fillColor)
            .attr('stroke', '#9ca3af')
            .attr('stroke-width', 1)
            .attr('rx', 2)
            .style('cursor', 'pointer')
            .on('click', (event) => {
              event.stopPropagation();
              onLocationSelect(loc);
            });
        });

        const dragBehavior = d3
          .drag<SVGGElement, Rack>()
          .on('start', () => {
            isDragging = true;
            draggedRack = d;
          })
          .on('drag', (event) => {
            const newX = Math.round(event.x / cellSize);
            const newY = Math.round(event.y / cellSize);
            if (newX >= 0 && newX < floorWidth && newY >= 0 && newY < floorHeight) {
              d3.select(this).attr(
                'transform',
                `translate(${newX * cellSize}, ${newY * cellSize})`
              );
            }
          })
          .on('end', (event) => {
            const newX = Math.max(0, Math.min(floorWidth - d.width, Math.round(event.x / cellSize)));
            const newY = Math.max(0, Math.min(floorHeight - d.height, Math.round(event.y / cellSize)));
            if (newX !== d.x || newY !== d.y) {
              onRackMove(d.id, newX, newY);
            }
            isDragging = false;
            draggedRack = null;
          });

        rack.call(dragBehavior);
      });

    const robotGroup = gridGroup.append('g');

    robotGroup
      .selectAll('.robot')
      .data(robots, (d: any) => d.id)
      .enter()
      .append('g')
      .attr('class', 'robot')
      .attr('transform', (d) => `translate(${d.x * cellSize + cellSize / 2}, ${d.y * cellSize + cellSize / 2})`)
      .each(function (d) {
        const robot = d3.select(this);
        const statusColor =
          d.status === 'idle'
            ? '#22c55e'
            : d.status === 'busy'
              ? '#3b82f6'
              : d.status === 'charging'
                ? '#f59e0b'
                : '#ef4444';

        robot
          .append('circle')
          .attr('r', cellSize * 0.4)
          .attr('fill', statusColor)
          .attr('stroke', 'white')
          .attr('stroke-width', 2);

        robot
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', 'white')
          .attr('font-size', `${Math.min(cellSize * 0.3, 10)}px`)
          .attr('font-weight', 'bold')
          .text(d.name.split('-')[1] || d.name);

        const batteryWidth = cellSize * 0.6;
        const batteryHeight = 4;
        robot
          .append('rect')
          .attr('x', -batteryWidth / 2)
          .attr('y', cellSize * 0.5)
          .attr('width', batteryWidth)
          .attr('height', batteryHeight)
          .attr('fill', '#374151')
          .attr('rx', 2);

        robot
          .append('rect')
          .attr('x', -batteryWidth / 2)
          .attr('y', cellSize * 0.5)
          .attr('width', batteryWidth * (d.battery / 100))
          .attr('height', batteryHeight)
          .attr('fill', d.battery > 20 ? '#22c55e' : '#ef4444')
          .attr('rx', 2);
      });
  }
</script>

<div bind:this={container} class="warehouse-canvas">
  <slot name="overlay" />
</div>

<style>
  .warehouse-canvas {
    width: 100%;
    height: 100%;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
  }
</style>
