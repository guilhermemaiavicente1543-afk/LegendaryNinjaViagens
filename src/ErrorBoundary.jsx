import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      info: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[LN DIGITAL ERROR BOUNDARY]", error, info);
    this.setState({ error, info });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh",
          padding: "32px",
          background: "#110806",
          color: "#f5e8d0",
          fontFamily: "monospace",
          whiteSpace: "pre-wrap"
        }}>
          <h1 style={{ color: "#ff6b35" }}>LN Digital caiu com erro</h1>

          <h2>Erro:</h2>
          <pre>{String(this.state.error?.message || this.state.error)}</pre>

          <h2>Stack:</h2>
          <pre>{String(this.state.error?.stack || "")}</pre>

          <h2>Component stack:</h2>
          <pre>{String(this.state.info?.componentStack || "")}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
