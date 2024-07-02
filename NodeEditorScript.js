var isMoving = false;
var minXconstraints = 0;
var minYconstraints = 0;
var maxXconstraints = window.innerWidth - 200;
var maxYconstraints = window.innerHeight;
var isButtonClosed = true;
var connectionData = {};
var transformers = {};
var observers = {};
var nodesDictionary = {
  Color: `<div class="node" node-type="color" >
      <div class="title">Color</div>
      <div class="content">
        <div class="link-node link-node-right">
          <span>Value</span>
          <div class="link-point" connection-id="" type=""  io-type="out" value="#ff0000"></div>
        </div>
        <div class="attribute">
          <span>Value</span>
          <input
            type="color"
            class="colorPicker"
            name="colorPicker"
            value="#ff0000"
          />
        </div>
      </div>
    </div>`,
  Output: ` <div class="node" node-type="output">
      <div class="title">Output</div>
      <div class="content">
        <div class="link-node link-node-left">
          <span>Color</span>
          <div class="link-point left-side" connection-id="" type=""  io-type="in" value=""></div>
        </div>
         <div class="output">
          <span>#------</span>
          <div class="color"> </div>
        </div>
      </div>
    </div>`,
  MixColor: ` <div class="node" node-type="mix-color">
      <div class="title">Mix Color</div>
      <div class="content">
        <div class="link-node link-node-right">
          <span>Output</span>
          <div class="link-point" connection-id="" type="" io-type="out" value=""></div>
        </div>
        <div class="input">
          <span>Average</span>
          <div class="arrow-down">
            <img src="./arrow-down.svg" alt="" srcset="" />
          </div>
          <ul class="combo-box-closed">
            <li>Average</li>
            <li>HSL</li>
            <li>Weighted</li>
          </ul>
        </div>
        <div class="link-node link-node-left">
          <span>Color 1</span>
          <div class="link-point left-side" connection-id="" type="" io-type="in" value=""></div>
        </div>
         <div class="link-node link-node-left">
          <span>Color 2</span>
          <div class="link-point left-side" connection-id="" type=""  io-type="in" value=""></div>
        </div>
      </div>
    </div>`,
};

var linkPoints = null;
var currentNode = null;
var targetNode = null;
var isDragging = false;
var isOver = false;
var currentNodeId = null;

document.addEventListener("DOMContentLoaded", function () {
  setupNodeEditor();
});

function setupNodeEditor() {
  setupBounds();
  setupLinkPoints();
  setupNodes();
  setupAddButton();
}

function setupNodes() {
  var nodes = document.querySelectorAll(".node");
  nodes.forEach((node) => {
    node.style.zIndex = "1";
    setupNode(node);
  });
}

function setupLinkPoints() {
  linkPoints = document.querySelectorAll(".link-point");
  linkPoints.forEach((linkPoint) => {
    setupLinkPoint(linkPoint);
  });
}

function setupAddButton() {
  var addButton = document.getElementsByClassName("add-node")[0];
  var nodeList = document.getElementsByClassName("node-list")[0];
  addButton.addEventListener("click", () => {
    if (isButtonClosed) {
      nodeList.classList.remove("closed");
      addButton.classList.add("close-button");
    } else {
      nodeList.classList.add("closed");
      addButton.classList.remove("close-button");
    }
    isButtonClosed = !isButtonClosed;
  });

  var nodeItems = document.querySelectorAll(".node-item");
  nodeItems.forEach((nodeItem) => {
    nodeItem.addEventListener("click", () => {
      var type = nodeItem.getAttribute("value");
      addNodeToBody(type);
      nodeList.classList.add("closed");
      addButton.classList.remove("close-button");
    });
  });

  function addNodeToBody(type) {
    const nodeDiv = document.createElement("div");
    nodeDiv.className = "node";
    nodeDiv.innerHTML = nodesDictionary[type];
    nodeDiv.style.zIndex = "1";
    setupNode(nodeDiv);
    linkPoints = nodeDiv.querySelectorAll(".link-point");
    linkPoints.forEach((linkPoint) => {
      setupLinkPoint(linkPoint);
    });
    document.body.appendChild(nodeDiv);
    switch (type) {
      case "MixColor":
          setupInput();;
        break;
      case "Output":
        setupOutputs();
        break;
      default:
        break;
    }

    // setupNodes();
    // setupLinkPoints();
  }
}
function setupBounds() {
  window.addEventListener("resize", () => {
    maxXconstraints = window.innerWidth - 200;
    maxYconstraints = window.innerHeight;
  });
}
function setupOutputs() {
  let output = document.querySelector(`[node-type="output"]`);
  let outNode = output.querySelector(".link-point");
  let callback = () => {
    let value = outNode.getAttribute("value");
    if (value && value.includes("#")) {
      let span = output.querySelector(".output span");
      let color = output.querySelector(".output .color");
      span.textContent = value;
      color.style.backgroundColor = value;
    }
    console.log("change");
  };
  addObserveToOutNode(null, outNode, callback);
}

function setupNode(node) {
  var input = node.querySelector(".attribute input");
  if (input) {
    input.addEventListener("change", (event) => {
      const value = event.target.value;
      let linkPoint = input.parentNode.parentNode.querySelector(
        ".link-node .link-point"
      );
      linkPoint.setAttribute("value", value);
    });
  }
  node.addEventListener("mousedown", function (e) {
    isMoving = true;
    document.querySelectorAll(".node").forEach((n) => {
      n.style.zIndex = "2";
    });
    node.style.zIndex = "3";
    const shiftX = e.clientX - node.getBoundingClientRect().left;
    const shiftY = e.clientY - node.getBoundingClientRect().top;

    function onMouseMove(e) {
      var childElements = node.querySelectorAll(".link-point");
      childElements.forEach((childElement) => {
        var ioType = childElement.getAttribute("io-type").trim();
        currentNodeId = childElement.getAttribute("connection-id").trim();
        function updateNode(id) {
          if (id) {
            var type = childElement.getAttribute("type");
            if (type == "start") {
              connectionData[id].startNodeRect =
                childElement.getBoundingClientRect();
            } else {
              connectionData[id].endNodeRect =
                childElement.getBoundingClientRect();
            }
            if (id) {
              updateConnectionOrigin(id);
            }
          }
        }
        if (ioType == "out") {
          var ids = currentNodeId.split(" ");
          for (const id of ids) {
            updateNode(id);
          }
        } else {
          updateNode(currentNodeId);
        }
      });

      if (isMoving) {
        var nextX = e.clientX - shiftX;
        var nextY = e.clientY - shiftY;
        maxYconstraints -= node.style.height;

        if (nextX > minXconstraints && nextX < maxXconstraints) {
          if (nextY > minYconstraints && nextY < maxYconstraints) {
            node.style.left = nextX + "px";
            node.style.top = nextY + "px";
          }
        }
      }
    }

    function onMouseUp(e) {
      isMoving = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
  node.ondragstart = function () {
    return false;
  };
}

function setupLinkPoint(linkPoint) {
  linkPoint.addEventListener("mousedown", (event) => {
    event.stopPropagation();
    currentNodeId = linkPoint.getAttribute("connection-id");
    currentNode = linkPoint;
    if (linkPoint.getAttribute("io-type") == "in") cleanNode(linkPoint);
    currentNodeId = createConnectionWithId();
    addNodeConnectionId(linkPoint, currentNodeId);
    linkPoint.setAttribute("type", "start");

    isDragging = true;
    function onMouseMove(event) {
      if (isDragging) {
        var isLeftSide = currentNode.classList.contains("left-side");
        updateConnectionPath(
          currentNodeId,
          { endX: event.clientX - 7, endY: event.clientY - 7 },
          isLeftSide
        );
      }
    }

    function onConnectionMouseUp(event) {
      event.stopPropagation();
      isDragging = false;
      if (!targetNode) {
        removeNodeConnectionId(currentNode, currentNodeId);
        removeConnection(currentNodeId);
      } else {
        var isValidConnection =
          currentNode.getAttribute("io-type") !=
          targetNode.getAttribute("io-type");
        var haveSameParent =
          currentNode.parentNode.parentNode ===
          targetNode.parentNode.parentNode;
        console.log(haveSameParent);
        if (isValidConnection && !haveSameParent) {
          if (targetNode.getAttribute("io-type") == "in") cleanNode(targetNode);
          updateToTargetNode();
        } else {
          removeNodeConnectionId(currentNode, currentNodeId);
          removeConnection(currentNodeId);
        }
      }
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onConnectionMouseUp);
    }

    document.addEventListener("mouseup", onConnectionMouseUp, {
      once: true,
    });

    document.addEventListener("mousemove", onMouseMove);
  });

  linkPoint.addEventListener("mouseover", (event) => {
    event.stopPropagation();
    if (isDragging) {
      isOver = true;
      targetNode = linkPoint;
    }
  });

  linkPoint.addEventListener("mouseleave", (event) => {
    event.stopPropagation();
    if (isDragging) {
      isOver = false;
      targetNode = null;
    }
  });
}

function setupInput() {
  var comboBox = document.querySelector(".input");
  var ul = comboBox.querySelector("ul");
  let className = "combo-box-closed";
  comboBox.addEventListener("click", () => {
    var hasClass = ul.classList.contains(className);
    hasClass ? ul.classList.remove(className) : ul.classList.add(className);
  });
  var lis = ul.querySelectorAll("li");
  lis.forEach((li) => {
    li.addEventListener("click", () => {
      comboBox.querySelector("span").textContent = li.textContent;
      let transformNode = comboBox.parentNode.parentNode;
      transform(transformNode);
    });
  });
}
function updateConnectionPath(
  id,
  { startX, startY, endX, endY },
  isLeftSide = false
) {
  if (isNaN(startX)) {
    var rect = currentNode.getBoundingClientRect();
    startX = rect.left - rect.width / 2;
    startY = rect.top - 2;
  }
  if (isLeftSide) {
    var swp = startX;
    startX = endX;
    endX = swp;
    swp = startY;
    startY = endY;
    endY = swp;
  }

  const offsetX = Math.abs(endX - startX) * 0.4;
  const cx1 = startX + offsetX;
  const cy1 = startY - 50;
  const cx2 = endX - offsetX;
  const cy2 = endY + 50;

  const pathData = `M ${startX},${startY} C ${cx1},${cy1} ${cx2},${cy2} ${endX},${endY}`;
  const connection = document.getElementById(id);
  connection.setAttribute("d", pathData);
}
function updateConnectionOrigin(id) {
  var rect = connectionData[id].startNodeRect;
  startX = rect.left - rect.width / 2;
  startY = rect.top - 2;
  rect = connectionData[id].endNodeRect;
  endX = rect.left - rect.width / 2;
  endY = rect.top - 2;
  var isLeftSide = connectionData[id].isLeftSide;
  updateConnectionPath(id, { startX, startY, endX, endY }, isLeftSide);
}

function updateToTargetNode() {
  addNodeConnectionId(targetNode, currentNodeId);
  let outNode, inNode;
  targetNode.setAttribute("type", "end");
  function updateNode(node) {
    node.style.backgroundColor = "yellow";
    if (node.getAttribute("io-type") == "in") {
      inNode = node;
    } else {
      outNode = node;
    }
  }
  updateNode(currentNode);
  updateNode(targetNode);
  inNode.setAttribute("value", outNode.getAttribute("value"));
  let transformNode = inNode.parentNode.parentNode.parentNode;
  transform(transformNode);

  connectionData[currentNodeId].endNodeRect =
    targetNode.getBoundingClientRect();
  let callback = () => {
    inNode.setAttribute("value", outNode.getAttribute("value"));
    let transformNode = inNode.parentNode.parentNode.parentNode;
    transform(transformNode);
  };
  addObserveToOutNode(currentNodeId, outNode, callback);
  updateConnectionOrigin(currentNodeId);
}
function createConnectionWithId() {
  var id = generateUUID();
  const connectionSVG = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  connectionSVG.setAttribute("id", "svg" + id);
  connectionSVG.setAttribute("width", "100%");
  connectionSVG.setAttribute("height", "100%");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("id", id);
  path.setAttribute("stroke", "white");
  path.setAttribute("stroke-width", "5");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("fill", "none");

  connectionSVG.appendChild(path);
  document.body.appendChild(connectionSVG);
  var isLeftSide = currentNode.classList.contains("left-side");

  connectionData[id] = {
    startNodeRect: currentNode.getBoundingClientRect(),
    endNodeRect: null,
    isLeftSide: isLeftSide,
  };
  return id;
}
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = crypto.getRandomValues(new Uint8Array(1))[0] % 16 | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
function removeConnection(id) {
  if (id) {
    var svg = document.getElementById("svg" + id);
    document.body.removeChild(svg);
    delete connectionData[id];
  }
}

function cleanNode(node) {
  var targetId = node.getAttribute("connection-id");
  let ioAttribute = node.getAttribute("io-type") == "out"?"in":"out"
  if (targetId != "") {
    var observer = observers[targetId];
    if (observer) {
      observer.disconnect();
      if (observers.hasOwnProperty(targetId)) {
        delete observers[targetId];
      }
    }
    var outputNode = document.querySelector(
      `[connection-id*="${targetId}"][io-type="${ioAttribute}"]`
    );
    console.log(outputNode);
    let connectionId = outputNode.getAttribute("connection-id");
    let newConnectionId = connectionId.replace(targetId, "").trim();
    outputNode.setAttribute(
      "connection-id",
      newConnectionId
    );
     if (newConnectionId == "") {
         outputNode.style.backgroundColor = "gray";
     }
    removeConnection(targetId);
  }
}

function addNodeConnectionId(node, id) {
  if (node.getAttribute("io-type") == "in") {
    node.setAttribute("connection-id", id);
  } else {
    let oldId = node.getAttribute("connection-id");
    node.setAttribute("connection-id", `${oldId} ${currentNodeId}`);
  }
}
function removeNodeConnectionId(node, id) {
  if (node.getAttribute("io-type") == "in") {
    node.setAttribute("connection-id", "");
    node.style.backgroundColor = "gray";
  } else {
    let oldId = node.getAttribute("connection-id");
    node.setAttribute("connection-id", oldId.replace(id, ""));
  }
}
function addObserveToOutNode(id, outNode, callback) {
  const config = { attributes: true, attributeFilter: ["value"] };
  const _callback = function (mutationsList, observer) {
    for (const mutation of mutationsList) {
      if (mutation.type === "attributes") {
        callback();
      }
    }
  };

  const observer = new MutationObserver(_callback);
  observer.observe(outNode, config);
  if (id) observers[id] = observer;
}

function transform(transformNode) {
  if (transformNode.getAttribute("node-type") == "mix-color") {
    let ioPoints = transformNode.querySelectorAll(".link-point");
    let mixFunction = transformNode.querySelector(".input span").textContent;
    let color1 = ioPoints[1].getAttribute("value");
    let color2 = ioPoints[2].getAttribute("value");
    let isInputsValid =
      color1 && color1.includes("#") && color2 && color2.includes("#");
    if (isInputsValid) {
      console.log("mix");
      let outputValue;
      switch (mixFunction) {
        case "HSL":
          outputValue = MixingColorUtils.mixColorsHsl(color1, color2);
          break;
        case "Weighted":
          outputValue = MixingColorUtils.mixColorsHsl(color1, color2);
          break;

        default:
          outputValue = MixingColorUtils.mixColorsAverage(color1, color2);
      }
      ioPoints[0].setAttribute("value", outputValue);
    }
  }
}

class MixingColorUtils {
  static hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  }

  static rgbToHex(r, g, b) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  static rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return { h, s, l };
  }

  static hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  static mixColorsHsl(hex1, hex2) {
    const rgb1 = MixingColorUtils.hexToRgb(hex1);
    const rgb2 = MixingColorUtils.hexToRgb(hex2);
    const hsl1 = MixingColorUtils.rgbToHsl(rgb1.r, rgb1.g, rgb1.b);
    const hsl2 = MixingColorUtils.rgbToHsl(rgb2.r, rgb2.g, rgb2.b);
    const mixedHsl = {
      h: (hsl1.h + hsl2.h) / 2,
      s: (hsl1.s + hsl2.s) / 2,
      l: (hsl1.l + hsl2.l) / 2,
    };
    const mixedRgb = MixingColorUtils.hslToRgb(
      mixedHsl.h,
      mixedHsl.s,
      mixedHsl.l
    );
    return MixingColorUtils.rgbToHex(mixedRgb.r, mixedRgb.g, mixedRgb.b);
  }
  static mixColorsWeighted(hex1, hex2, weight1 = 0.5, weight2 = 0.5) {
    const rgb1 = MixingColorUtils.hexToRgb(hex1);
    const rgb2 = MixingColorUtils.hexToRgb(hex2);
    const mixedRgb = {
      r: Math.round(rgb1.r * weight1 + rgb2.r * weight2),
      g: Math.round(rgb1.g * weight1 + rgb2.g * weight2),
      b: Math.round(rgb1.b * weight1 + rgb2.b * weight2),
    };
    return MixingColorUtils.rgbToHex(mixedRgb.r, mixedRgb.g, mixedRgb.b);
  }
  static mixColorsAverage(hex1, hex2) {
    const rgb1 = MixingColorUtils.hexToRgb(hex1);
    const rgb2 = MixingColorUtils.hexToRgb(hex2);
    const mixedRgb = {
      r: Math.round((rgb1.r + rgb2.r) / 2),
      g: Math.round((rgb1.g + rgb2.g) / 2),
      b: Math.round((rgb1.b + rgb2.b) / 2),
    };
    return MixingColorUtils.rgbToHex(mixedRgb.r, mixedRgb.g, mixedRgb.b);
  }
}
