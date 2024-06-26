const { countries } = require("k-utilities");

class Firewall {
  constructor(cookie, jwt, fetch, logger) {
    this.cookie = cookie;
    this.jwt = jwt;
    this.config = env.FIREWALL;
    this.fetch = fetch;
    this.checkRequestInfo = this.checkRequest.bind(this);
    this.adminRequired = this.isAdmin.bind(this);
    this.authRequired = this.authenticationRequired.bind(this);
    this.sellerRequired = this.isSeller.bind(this);
    this.updateExchangeRates();
    this.logger = logger;
  }

  async checkRequest(request, response, next) {
    const { ip, country } = await this.checkGeo(request.headers["x-forwarded-for"]);
    const { symbol, code, rate } = this.checkCurrency(country);
    request.user = { ip, country, currency: symbol, rate, type: "visitor", displayName: "Guest" };
    const token = this.cookie.parse(request.headers.cookie || "")["userToken"];
    if (token) {
      const user = this.parseToken(token);
      if (user && user.ip === ip) request.user = { ...request.user, ...user };
      else response.clearCookie("userToken");
    }
    next();
  }
  // This is a middleware for "/admin"
  isAdmin(request, response, next) {
    request.user.type === "admin" ? next() : response.status(404).end('{"error":"Not found (!)"}');
  }
  // This is a middleware for "/seller"
  isSeller(request, response, next) {
    const { type } = request.user;
    if (type === "seller" || type === "admin") return next();
    response.status(401).end('{"error":"Unauthorized request (!)"}');
  }
  // This middleware for any info need auth to access
  authenticationRequired(request, response, next) {
    if (!request.user.id) return response.status(401).end('{"error":"Unauthorized request(!)"}');
    next();
  }
  setToken(userInfo, response) {
    const token = this.createToken(userInfo);
    response.cookie("userToken", token, this.config.cookieOption);
  }
  parseToken(token) {
    try {
      return this.jwt.verify(token, this.config.secretKey).payload;
    } catch (error) {
      return null;
    }
  }
  createToken(payload) {
    try {
      return this.jwt.sign({ payload }, this.config.secretKey);
    } catch (error) {
      return null;
    }
  }
  async checkGeo(ip) {
    try {
      const res = await this.fetch(this.config.geoApi.replace("xxx", ip)).then((res) => res.json());
      return res && res.country ? res : { ip, country: this.config.country };
    } catch (error) {
      return { ip, country: this.config.country };
    }
  }
  checkCurrency(country) {
    const currInfo = { symbol: "€", code: "EUR", rate: 1 };
    if (!country || !countries[country] || countries[country][1] === "EU") return currInfo;
    return !this.rates.USD ? currInfo : { symbol: "$", code: "USD", rate: this.rates.USD };
  }
  async updateExchangeRates() {
    try {
      const url = "https://api.exchangeratesapi.io/latest?base=EUR";
      const exchangeInfo = await this.fetch(url).then((res) => res.json());
      if (exchangeInfo.rates) this.rates = { ...exchangeInfo.rates };
      setTimeout(() => this.updateExchangeRates(), 1000 * 60 * 60 * 24);
    } catch (error) {
      this.logger.error("Failed to fetch the Exchange Rate");
    }
  }
}

module.exports = Firewall;
