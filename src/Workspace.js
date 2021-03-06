import React, { useState, useEffect } from "react";
import { Stage, Layer, Rect, Group, Portal } from "react-konva";
import {MIST} from "./mist.js";
import Menu from "./Menu";
import gui from "./mistgui-globals";
import FunNode from "./FunNode";
import ValNode from "./ValNode";
import DrawArrow from "./line";
import FunBar from "./FunBar";
import { width, height } from "./mistgui-globals";
import { useStrictMode } from "react-konva";

//container for everything related to the create workspace
export default function Workspace(props) {
  //hmm does this actually do anything?
  useStrictMode(true);

  //example layouts for testing
  var layout1 = new MIST.Layout();
  var add = layout1.addOp("add", 300, 325);
  var x = layout1.addVal("x", 150, 250);
  var y = layout1.addVal("y", 150, 400);
  layout1.addEdge(x, add, 0);
  layout1.addEdge(y, add, 1);
  var mult = layout1.addOp("multiply", 500, 300);
  var k = layout1.addVal("x", 450, 450);
  layout1.addEdge(add, mult, 2);
  layout1.addEdge(k, mult, 3);
  var sin = layout1.addOp("sine", 675, 350);
  layout1.addEdge(mult, sin, 4);
  var square = layout1.addOp("square", 850, 250);
  layout1.addEdge(sin, square, 5);

  const [layouts, setLayouts] = useState([layout1]);
  const [nodes, setNodes] = useState([]);
  const [lines, setLines] = useState([]);
  const [newSource, setNewSource] = useState(null);
  const [mouseListenerOn, setMouseListenerOn] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: null, y: null });
  const [tempLine, setTempLine] = useState(null);
  const [currShape, setCurrShape] = useState();
  const [currText, setCurrText] = useState();
  const [history, setHistory] = useState([]);

  function displayLayout() {
    for (var i = 0; i < layouts.length; i++) {
      var IDindices = [];
      const IDoffset = nodes.length;
      var layout = layouts[i];
      let tempNodes = [...nodes];
      for (var id in layout.operations) {
        IDindices.push(id);
        var op = layout.operations[id];
        const node = {
          name: op.name,
          type: "fun",
          x: op.x,
          y: op.y,
          renderFunction: null,
          lineFrom:[],
          numInputs: 0, numOutlets: gui.functions[op.name].min };
          tempNodes.push(node);
      }
      for (id in layout.values) {
        IDindices.push(id);
        var val = layout.values[id];
        const node = { name: val.name, type: 'val',
          x: val.x, y: val.y,
          renderFunction: val.name,
          hasLine: false };
          tempNodes.push(node);
      }
      let newLines = [...lines];
      for (var j = 0; j < layout.edges.length; j++) {
        var edge = layout.edges[j];
        var source =
          layout.operations[edge.source] || layout.values[edge.source];
        if (!source) {
          throw "Invalid source in edge from " +
            edge.source +
            " to " +
            edge.sink;
        }
        var sink = layout.operations[edge.sink];
        if (!sink) {
          throw "Invalid sink in edge from " + edge.source + " to " + edge.sink;
        }
        var sourceIndex = IDindices.indexOf(source.id) + IDoffset;
        var sinkIndex = IDindices.indexOf(sink.id) + IDoffset;
        newLines.push({
          sourceIndex: sourceIndex,
          sinkIndex: sinkIndex
        });
        tempNodes[sourceIndex].hasLine = true;
        tempNodes[sinkIndex].numInputs += 1;
        tempNodes[sinkIndex].lineFrom.push(sourceIndex);
      }
      setNodes(tempNodes);
      setLines(newLines);
    }
  }

  function pushNode(type, name, x, y) {
    var newLst = [...nodes];
    const node = {
      name: name,
      type: type,
      x: x,
      y: y,
      renderFunction: type === 'fun'? null : name,
      hasLine: type === 'val'? false : null,
      lineFrom: [],
      numInputs: 0,
      numOutlets: type === 'fun'? gui.functions[name].min : 0
    };
    newLst.push(node);
    setNodes(newLst);
  }

  /**
   * Pushes a new line to 'lines'. Updates information for the sink node.
   * @param {int} source 
   * @param {int} sink 
   */
  function pushLine(source, sink) {
    console.log("pushLine")
    console.log("source: "+nodes[source].name);
    console.log("sink: "+nodes[sink].name);
    let newLines = [...lines];
    newLines.push({
      sourceIndex: source,
      sinkIndex: sink
    });
    setLines(newLines);
    var newNodes = [...nodes];
    newNodes[source].hasLine = true;
    newNodes[sink].numInputs += 1; // updating the number of inputs for sink node
    if(newNodes[sink].numInputs >= newNodes[sink].numOutlets) {
      newNodes[sink].numOutlets += 1;
    }
    newNodes[sink].lineFrom.push(source);
    setNodes(newNodes);
  }

  function updatePosition(index, x, y) {
    var newLst = [...nodes];
    newLst[index].x = x;
    newLst[index].y = y;
    setNodes(newLst);
  }

  function removeLine(index) {
    const source = lines[index].sourceIndex;
    const sink = lines[index].sinkIndex;
    var newNodes = [...nodes];
    newNodes[source].hasLine = false;
    newNodes[sink].numInputs -= 1;
    if(newNodes[sink].numOutlets > gui.functions[newNodes[sink].name].min) {
      newNodes[sink].numOutlets -= 1;
    }
    newNodes[sink].lineFrom.splice(newNodes[sink].lineFrom.indexOf(source), 1);
    newNodes[sink].renderFunction = null;
    setNodes(newNodes);
    var newLst = [...lines];
    newLst.splice(index, 1);
    setLines(newLst);
  }

  /**
   * Finds and sets the render function of the node of given index.
   * @param {int} index 
   */
  function findRenderFunction(index) {
    const node = nodes[index];
    var rf = node.renderFunction;
    if(!rf && node.lineFrom.length > 0) {
      var rf = gui.functions[node.name].prefix + '(';
      for(var i = 0; i < node.lineFrom.length; i++) {
        rf += findRenderFunction(node.lineFrom[i]);
        rf += ",";
      }
      rf = rf.substring(0, rf.length - 1) + ")";
    }
    return rf;
  }
  
  /**
   * When a function gets clicked, it's either with the intention of displaying the function
   * or making a line.
   * @param {int} index 
   */
  function funClicked(index) {
    console.log("newSource: "+newSource);
    if(newSource != null && newSource != index && nodes[index].type === 'fun' &&
      nodes[index].numInputs < gui.functions[nodes[index].name].max) { // a line coming out of source
      //console.log("new line from node"+nodes[newSource].name+"to node"+nodes[index].name);
      pushLine(newSource, index);
    }
    else {
      const rf = findRenderFunction(index);
      var newLst = [...nodes];
      newLst[index].renderFunction = rf;
      setNodes(newLst);
      setCurrText(rf);
    }
  }

  /**
   * Called when a node is clicked.
   * @param {int} index 
   */
  function valClicked(index) {
    setCurrText(nodes[index].renderFunction);
  }

  function updateMousePosition(x, y) {
    //console.log("updateMousePosition; x:"+x+" y:"+y);
    setMousePosition({ x: x, y: y });
  };

  /**
   * Called when a node is double-clicked.
   * @param {int} index 
   */
  function dblClicked(index) {
    if(!tempLine) {
      setNewSource(index);
      setMouseListenerOn(true);
      setMousePosition({
        x: nodes[index].x + gui.functionRectSideLength / 2,
        y: nodes[index].y + gui.functionRectSideLength / 2
      });
      setTempLine({sourceX: nodes[index].x, sourceY: nodes[index].y});
    }
  }

  function clearNode() {
    setNodes([]);
    setLines([]);
  }

  /**
   * Called when the background is clicked.
   */
  function bgClicked(e) {
    setNewSource(null);
    setTempLine(null);
    setMouseListenerOn(false);
  }

  useEffect(() => {
    displayLayout();
  }, []);

  return (
    <div id="workspace">
      <Stage width={width} height={height}
        onClick={bgClicked}
        onMouseMove={(e) => {
          if(mouseListenerOn) {
            updateMousePosition(e.evt.clientX, e.evt.clientY);
          }
        }}
      >
        <Layer>
          <Group>
            <Rect
              y={gui.menuHeight}
              width={width}
              height={height-gui.menuHeight}
              fill={'white'}
              
            />
            {tempLine &&
            <DrawArrow
              sourceX={tempLine.sourceX + gui.functionRectSideLength / 2}
              sourceY={tempLine.sourceY + gui.functionRectSideLength / 2}
              sinkX={mousePosition.x}
              sinkY={mousePosition.y}
            />
            }
          </Group>
          
          <Menu addNode = {pushNode} clearNode={clearNode}/>
          {(nodes.length !== 0)
          ? (lines.map((line, index) => (
            <DrawArrow
              index={index}
              sourceX={nodes[line.sourceIndex].x + gui.functionRectSideLength / 2} // x-coord of the source
              sourceY={nodes[line.sourceIndex].y + gui.functionRectSideLength / 2} // y-coord of the source
              sinkX={nodes[line.sinkIndex].x - 4 * gui.outletXOffset} // x-coord of the sink
              sinkY={nodes[line.sinkIndex].y
                + (nodes[line.sinkIndex].lineFrom.indexOf(line.sourceIndex) + 1) * gui.outletYOffset
                + gui.functionHalfStrokeWidth} // y-coord of the sink
              removeLine={removeLine}
            />
          )))
          : null}
          
          {nodes.map((node, index) => (
            (node.type === 'fun')
            ? <FunNode
              name={node.name}
              index={index}
              x={node.x}
              y={node.y}
              numInputs={node.numInputs}
              numOutlets={node.numOutlets}
              findRF={findRenderFunction}
              handler={updatePosition}
              clickHandler={funClicked}
              dblClickHandler={dblClicked}
            />
            : <ValNode
              name={node.name}
              index={index}
              x={node.x}
              y={node.y}
              renderFunction={node.renderFunction}
              handler={updatePosition}
              clickHandler={valClicked}
              dblClickHandler={dblClicked}
            />
          ))}
          <FunBar
            text={currText}/>
        </Layer>
      </Stage>
    </div>
  );
}
