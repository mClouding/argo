import * as React from 'react';
import {FilterDropDown} from '../filter-drop-down';
import {GraphIcon} from './icon';
import {formatLabel} from './label';
import {layout} from './layout';
import {Graph, Node} from './types';

require('./graph-panel.scss');

interface Props {
    graph: Graph;
    types: {[type: string]: boolean};
    classNames: {[type: string]: boolean};
    options?: React.ReactNode; // add to the option panel
    nodeSize?: number; // default "64"
    horizontal?: boolean; // default "false"
    hideTypes?: boolean; // default "false"
    iconShape?: 'rect' | 'circle'; // default "rect"
    edgeStrokeWidthMultiple?: number; // multiple by X, default "1"
    selectedNode?: Node;
    onNodeSelect?: (id: Node) => void;
}

export const GraphPanel = (props: Props) => {
    const [nodeSize, setNodeSize] = React.useState(props.nodeSize || 64);
    const [horizontal, setHorizontal] = React.useState(props.horizontal);
    const [fast, setFast] = React.useState(false);
    const [types, setTypes] = React.useState(props.types);
    const [classNames, setClassNames] = React.useState(props.classNames);

    const visible = (id: Node) => {
        const label = props.graph.nodes.get(id);
        return types[label.type] && Object.entries(classNames).find(([className, checked]) => checked && className.includes(label.classNames || ''));
    };

    layout(props.graph, nodeSize, horizontal, id => !visible(id), fast);
    const width = props.graph.width;
    const height = props.graph.height;

    return (
        <div>
            <div className='graph-options-panel'>
                <FilterDropDown
                    key='types'
                    values={types}
                    onChange={(label, checked) => {
                        setTypes(from => {
                            const to = Object.assign({}, from);
                            to[label] = checked;
                            return to;
                        });
                    }}
                />
                <FilterDropDown
                    key='class-names'
                    values={classNames}
                    onChange={(label, checked) => {
                        setClassNames(from => {
                            const to = Object.assign({}, from);
                            to[label] = checked;
                            return to;
                        });
                    }}
                />
                <a onClick={() => setHorizontal(s => !s)} title='Horizontal/vertical layout'>
                    <i className={`fa ${horizontal ? 'fa-long-arrow-alt-right' : 'fa-long-arrow-alt-down'}`} />
                </a>
                <a onClick={() => setNodeSize(s => s * 1.2)} title='Zoom in'>
                    <i className='fa fa-search-plus' />
                </a>
                <a onClick={() => setNodeSize(s => s / 1.2)} title='Zoom out'>
                    <i className='fa fa-search-minus' />
                </a>
                <a onClick={() => setFast(s => !s)} title='Use faster, but less pretty renderer' className={fast ? 'active' : ''}>
                    <i className='fa fa-bolt' />
                </a>
                {props.options}
            </div>
            <div className='graph'>
                {props.graph.nodes.size === 0 ? (
                    <p>Nothing to show</p>
                ) : (
                    <svg key='graph' width={width + nodeSize * 2} height={height + nodeSize * 2}>
                        <defs>
                            <marker id='arrow' viewBox='0 0 10 10' refX={10} refY={5} markerWidth={nodeSize / 8} markerHeight={nodeSize / 8} orient='auto-start-reverse'>
                                <path d='M 0 0 L 10 5 L 0 10 z' className='arrow' />
                            </marker>
                        </defs>
                        <g transform={`translate(${nodeSize},${nodeSize})`}>
                            {Array.from(props.graph.nodeGroups).map(([g, nodes]) => {
                                const r: {x1: number; y1: number; x2: number; y2: number} = {
                                    x1: width,
                                    y1: height,
                                    x2: 0,
                                    y2: 0
                                };
                                nodes.forEach(n => {
                                    const l = props.graph.nodes.get(n);
                                    r.x1 = Math.min(r.x1, l.x);
                                    r.y1 = Math.min(r.y1, l.y);
                                    r.x2 = Math.max(r.x2, l.x);
                                    r.y2 = Math.max(r.y2, l.y);
                                });
                                return (
                                    <g key={`group/${g}`} className='group' transform={`translate(${r.x1 - nodeSize},${r.y1 - nodeSize})`}>
                                        <rect width={r.x2 - r.x1 + 2 * nodeSize} height={r.y2 - r.y1 + 2 * nodeSize} />
                                    </g>
                                );
                            })}
                            {Array.from(props.graph.edges)
                                .filter(([, label]) => label.points)
                                .map(([e, label]) => (
                                    <g key={`edge/${e.v}/${e.w}`} className={`edge ${label.classNames !== undefined ? label.classNames : 'arrow'}`}>
                                        <path
                                            d={label.points.map((p, j) => (j === 0 ? `M ${p.x} ${p.y} ` : `L ${p.x} ${p.y}`)).join(' ')}
                                            className='line'
                                            strokeWidth={((props.edgeStrokeWidthMultiple || 1) * nodeSize) / 32}
                                        />
                                        <g transform={`translate(${label.points[label.points.length === 1 ? 0 : 1].x},${label.points[label.points.length === 1 ? 0 : 1].y})`}>
                                            <text className='edge-label' style={{fontSize: nodeSize / 6}}>
                                                {formatLabel(label.label)}
                                            </text>
                                        </g>
                                    </g>
                                ))}
                            {Array.from(props.graph.nodes)
                                .filter(([n, label]) => label.x !== null && visible(n))
                                .map(([n, label]) => (
                                    <g key={`node/${n}`} transform={`translate(${label.x},${label.y})`}>
                                        <title>{n}</title>
                                        <g
                                            className={`node ${label.classNames || ''} ${props.selectedNode === n ? ' selected' : ''}`}
                                            onClick={() => props.onNodeSelect && props.onNodeSelect(n)}>
                                            {props.iconShape === 'circle' ? (
                                                <circle r={nodeSize / 2} className='bg' />
                                            ) : (
                                                <rect x={-nodeSize / 2} y={-nodeSize / 2} width={nodeSize} height={nodeSize} className='bg' rx={nodeSize / 4} />
                                            )}
                                            <GraphIcon icon={label.icon} progress={label.progress} nodeSize={nodeSize} />
                                            {props.hideTypes || (
                                                <text y={nodeSize * 0.33} className='type' style={{fontSize: nodeSize * 0.2}}>
                                                    {label.type}
                                                </text>
                                            )}
                                        </g>
                                        <g transform={`translate(0,${(nodeSize * 3) / 4})`}>
                                            <text className='node-label' style={{fontSize: nodeSize / 5}}>
                                                {formatLabel(label.label)}
                                            </text>
                                        </g>
                                    </g>
                                ))}
                        </g>
                    </svg>
                )}
            </div>
        </div>
    );
};