import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import * as d3 from 'd3'
import { useAuthStore } from '@/store'
import { graphApi } from '@/lib/api'
import { Loader2, RefreshCw, Network, Search, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

export default function Graph() {
  const { folderId } = useParams()
  const { user } = useAuthStore()
  const svgRef = useRef(null)
  const zoomBehaviorRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [graphData, setGraphData] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
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

    const svg = d3.select(el)
      .attr('width', width).attr('height', height)

    const g = svg.append('g')

    const zoom = d3.zoom().scaleExtent([0.3, 3.5]).on('zoom', e => g.attr('transform', e.transform))
    svg.call(zoom)
    zoomBehaviorRef.current = { zoom, svg }

    const nodes = graphData.nodes.map(d => ({ ...d }))
    const edges = graphData.edges.map(d => ({ ...d }))

    const getColor = (node) => {
      if (node.group === 1) return '#c7d2fe'
      if (node.group === 2) return '#818cf8'
      if (node.group >= 3) return '#6366f1'
      return '#e0e7ff'
    }

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(d => 80 + (4 - Math.min(d.weight, 4)) * 15))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => Math.sqrt(d.frequency || 1) * 8 + 18))

    const link = g.append('g').selectAll('line')
      .data(edges).enter().append('line')
      .attr('stroke', '#e0e7ff')
      .attr('stroke-width', d => Math.min(Math.sqrt(d.weight), 3))
      .attr('stroke-opacity', 0.75)

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
      .attr('stroke', d => d.group >= 2 ? '#6366f1' : '#c7d2fe')
      .attr('stroke-width', 1.5)
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
      .attr('fill', '#374151')
      .attr('font-weight', '500')

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: '#9ca3af' }}>
      <Loader2 size={20} className="animate-spin" /> Extracting concept graph...
    </div>
  )

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
      <Network size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
      <p style={{ fontWeight: 600, marginBottom: 4 }}>Could not load graph</p>
      <p style={{ fontSize: '0.875rem', marginBottom: 16 }}>{error}</p>
      <button onClick={() => loadGraph(true)} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <RefreshCw size={13} /> Retry
      </button>
    </div>
  )

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', letterSpacing: '-0.02em' }}>Knowledge Graph</h2>
          <p style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{stats.nodes} concepts · {stats.edges} connections</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 9, height: 9, borderRadius: '50%', background: '#c7d2fe' }} /> 1 doc</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 9, height: 9, borderRadius: '50%', background: '#818cf8' }} /> 2 docs</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 9, height: 9, borderRadius: '50%', background: '#6366f1' }} /> 3+ docs</span>
          </div>
          <button onClick={() => loadGraph(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Graph canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {(!graphData?.nodes?.length) ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: '#9ca3af' }}>
            <Network size={36} style={{ opacity: 0.35 }} />
            <p style={{ fontSize: '0.875rem' }}>No indexed documents yet — upload and process documents first.</p>
          </div>
        ) : (
          <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
        )}

        {/* Zoom controls floating bar */}
        {graphData?.nodes?.length > 0 && (
          <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', gap: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 4, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <button onClick={() => handleZoom(1.3)} title="Zoom in" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#374151', borderRadius: 5 }}><ZoomIn size={16} /></button>
            <button onClick={() => handleZoom(0.7)} title="Zoom out" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#374151', borderRadius: 5 }}><ZoomOut size={16} /></button>
            <button onClick={() => handleZoom(0)} title="Reset zoom" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#374151', borderRadius: 5 }}><Maximize2 size={16} /></button>
          </div>
        )}

        {/* Node info panel */}
        {selectedNode && (
          <div style={{ position: 'absolute', top: 16, right: 16, width: 250, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>{selectedNode.label}</h3>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div>Frequency across docs: <strong>{selectedNode.frequency}</strong></div>
              <div>Spans <strong>{selectedNode.doc_ids?.length || 1}</strong> document(s)</div>
              {selectedNode.doc_names?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 3, color: '#374151' }}>Documents:</div>
                  {selectedNode.doc_names.map(name => (
                    <div key={name} style={{ padding: '2px 0', color: '#6366f1', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {name}</div>
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
