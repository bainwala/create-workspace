import React, { Component } from "react";
import { Line, Arrow } from "react-konva";
import gui from './mistgui-globals';

class DrawArrow extends Component {
  state = {
    isDrawing: false,
    mode: "brush"
  };

  componentDidMount() {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    const context = canvas.getContext("2d");

    this.setState({ canvas, context });
  }

  handleMouseDown = () => {
    console.log("MOUS DOWN", this.arrow);

    this.setState({ isDrawing: true });

    // TODO: improve
    const stage = this.arrow.parent.parent;
    this.lastPointerPosition = stage.getPointerPosition();

    console.log(this.lastPointerPosition);

    this.setState({
      posX: this.lastPointerPosition.x,
      poxY: this.lastPointerPosition.y
    });
  };

  handleMouseUp = () => {
    this.setState({ isDrawing: false });
  };

  handleMouseMove = () => {
    if (this.state.isDrawing) {
      const stage = this.arrow.parent.parent;
      this.lastPointerPosition = stage.getPointerPosition();
      var pos = stage.getPointerPosition();
      var oldPoints = this.arrow.points();
      this.arrow.points([oldPoints[0], oldPoints[1], pos.x, pos.y]);
      this.arrow.getLayer().draw();
    }
  };

  render() {
    return (
      <Line
        ref={ref => (this.arrow = ref)}
        points={[this.props.sourceX - 5 * gui.outletXOffset,
          this.props.sourceY + 1.5 * gui.outletYOffset,
          this.props.sinkX - 5 * gui.outletXOffset,
          this.props.sinkY + 1.5 * gui.outletYOffset]}
        pointerLength={0}
        pointerWidth={0}
        fill="black"
        stroke="black"
        strokeWidth={3}
        onMouseDown={this.handleMouseDown}
        onMouseUp={this.handleMouseUp}
        onMouseMove={this.handleMouseMove}
      />
    );
  }
}

export default DrawArrow