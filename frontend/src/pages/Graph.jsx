import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import * as d3 from 'd3'
import { useAuthStore } from '@/store'
import { graphApi } from '@/lib/api'
import { Loader2, RefreshCw, Network, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

export default function Graph() {
  const { folderId } = useParams()
  const { user } = useAuthStore()
  const svgRef = useRef(null)
  const zoomBehaviorRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [graphData, setGraphData] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [stats, setStats] = useState({ nodes: 0, edges: 0 })

  const loadGraph = async (forceRefresh = false) => {
    if (!user?.token) return
    setLoading(true); setError(null)
    try {
      const data = await graphApi.get(user.token, folderId, forceRefresh)
      setGraphData(data)
      setStats({ nodes: data.nodes?.length || 0, edges: data.edges?.length || 0 })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadGraph() }, [folderId, user?.token])

  useEffect(() => {
    if (!graphData?.nodes?.length || !svgRef.current) return

    const el = svgRef.current
    const { width, height } = el.getBoundingClientRect()
    d3.select(el).selectAll('*').remove()

    const svg = d3.select(el).attr('width', width).attr('height', height)
    const g = svg.append('g')

    const zoom = d3.zoom().scaleExtent([0.3, 3.5]).on('zoom', e => g.attr('transform', e.transform))
    svg.call(zoom)
    zoomBehaviorRef.current = { zoom, svg }

    const nodes = graphData.nodes.map(d => ({ ...d }))
    const edges = graphData.edges.map(d => ({ ...d }))

    const getColor = (node) => {
      if (node.group === 1) return '#c7d2fe'
      if (node.group === 2) return '#818cf8'
      if (node.group >= 3) return '#4f46e5'
      return '#e0e7ff'
    }

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(d => 80 + (4 - Math.min(d.weight, 4)) * 15))
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => Math.sqrt(d.frequency || 1) * 8 + 20))

    const link = g.append('g').selectAll('line')
      .data(edges).enter().append('line')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', d => Math.min(Math.sqrt(d.weight), 3))
      .attr('stroke-opacity', 0.8)

    const node = g.append('g').selectAll('g')
      .data(nodes).enter().append('g')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null })
      )

    node.append('circle')
      .attr('r', d => Math.min(Math.sqrt((d.frequency || 1)) * 5 + 8, 28))
      .attr('fill', d => getColor(d))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('class', 'shadow-md')
      .on('click', (e, d) => {
        e.stopPropagation()
        setSelectedNode(d)
      })

    node.append('text')
      .text(d => d.label.length > 13 ? d.label.slice(0, 13) + '…' : d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', d => Math.min(Math.sqrt((d.frequency || 1)) * 5 + 8, 28) + 14)
      .attr('font-size', '10px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('fill', '#334155')
      .attr('font-weight', '600')

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    svg.on('click', () => setSelectedNode(null))

    return () => simulation.stop()
  }, [graphData])

  const handleZoom = (factor) => {
    if (!zoomBehaviorRef.current) return
    const { zoom, svg } = zoomBehaviorRef.current
    if (factor === 0) {
      svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity)
    } else {
      svg.transition().duration(300).call(zoom.scaleBy, factor)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen gap-2.5 text-slate-400 text-sm">
      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Generating Knowledge Graph...
    </div>
  )

  if (error) return (
    <div className="p-10 text-center text-slate-600">
      <Network className="w-10 h-10 mx-auto mb-2.5 opacity-40" />
      <p className="font-bold text-slate-800 mb-1">Could not load graph</p>
      <p className="text-xs mb-4 text-slate-500">{error}</p>
      <button onClick={() => loadGraph(true)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-xs">
        Retry
      </button>
    </div>
  )

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50/30">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200/80 bg-white flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="font-extrabold text-lg text-slate-900 tracking-tight">Interactive Knowledge Graph</h2>
          <p className="text-xs text-slate-500">{stats.nodes} extracted concepts · {stats.edges} co-occurrence edges</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-3 hidden sm:flex">
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-200" /> 1 document</span>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-400" /> 2 documents</span>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> 3+ documents</span>
          </div>
          <button
            onClick={() => loadGraph(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Graph
          </button>
        </div>
      </div>

      {/* Graph Viewport */}
      <div className="flex-1 relative overflow-hidden">
        {(!graphData?.nodes?.length) ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
            <Network className="w-10 h-10 opacity-30" />
            <p className="text-sm font-medium">No documents indexed in this folder yet.</p>
          </div>
        ) : (
          <svg ref={svgRef} className="w-full h-full" />
        )}

        {/* Zoom Controls */}
        {graphData?.nodes?.length > 0 && (
          <div className="absolute bottom-6 right-6 flex gap-1 bg-white border border-slate-200/90 rounded-xl p-1 shadow-md">
            <button onClick={() => handleZoom(1.3)} title="Zoom in" className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => handleZoom(0.7)} title="Zoom out" className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><ZoomOut className="w-4 h-4" /></button>
            <button onClick={() => handleZoom(0)} title="Reset zoom" className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Maximize2 className="w-4 h-4" /></button>
          </div>
        )}

        {/* Concept Inspector Overlay */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-64 bg-white rounded-2xl border border-slate-200 p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">{selectedNode.label}</h3>
            </div>
            <div className="text-xs text-slate-600 space-y-2">
              <div>Frequency: <strong className="text-slate-900">{selectedNode.frequency}</strong></div>
              <div>Appears in <strong className="text-slate-900">{selectedNode.doc_ids?.length || 1}</strong> document(s)</div>
              {selectedNode.doc_names?.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-700 block mb-1">Source Files:</span>
                  {selectedNode.doc_names.map(name => (
                    <div key={name} className="text-indigo-600 truncate py-0.5">📄 {name}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
