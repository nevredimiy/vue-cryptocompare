const API_KEY = '4921631bb8df3f291a6fb903fead75c01e4490503348c66e14029a6d43bd1884';
const tickersHandlers = new Map();
const tickersInvalidSub = [];
//TODO: refactor to use URLSearchParams
const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);
const AGGREGATE_INDEX = "5";
socket.addEventListener("message", e => {
  const { TYPE: type, MESSAGE: messageRes, PARAMETER: parameter, FROMSYMBOL: currency, PRICE: newPrice } = JSON.parse(e.data);

  if (messageRes === 'INVALID_SUB') {
    tickersInvalidSub.push(parameter.split("~")[2]);
  };
  if (type !== AGGREGATE_INDEX || newPrice === undefined) {
    return;
  }
  const handlers = tickersHandlers.get(currency) ?? [];
  handlers.forEach(fn => fn(newPrice));
});

export const invalidSub = (ticker, cb) => {
  socket.addEventListener("message", (e) => {
    if (!e.data.MESSAGE === 'INVALID_SUB') return;
    tickersInvalidSub.forEach(t => {
      if (t === ticker) {
        cb();
      }
    })
  });
}
function sendToWebSocket(message) {
  const stringifiedMessage = JSON.stringify(message);
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifiedMessage);
    return;
  }

  socket.addEventListener(
    "open",
    () => {
      socket.send(stringifiedMessage);
    },
    { once: true }
  );
}

function subscribeToTickerOnWs(ticker) {
  sendToWebSocket({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
}

function unsubscribeFromTickerOnWs(ticker) {
  sendToWebSocket({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
}

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subscribeToTickerOnWs(ticker);
};

export const unsubscribeFromTicker = ticker => {
  tickersHandlers.delete(ticker);
  unsubscribeFromTickerOnWs(ticker);
};



window.tickersInvalidSub = tickersInvalidSub;
