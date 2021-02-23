const { Validator, Formatter, CustomError } = require("k-utilities");

class CreateShipmentCommand {
  constructor(shipment) {
    this.id = Formatter.newId();
    this.productsOwner = shipment.productsOwner;
    this.orderId = shipment.orderId;
    this._soldItemIds = shipment.soldItemIds;
    this._carrier = shipment.carrier;
    this._trackNumber = shipment.trackNumber;
    this.shippingDate = null;
    this.deliveryDate = null;
    this.note = null;
  }

  set _soldItemIds(value) {
    this.soldItemIds = Formatter.stringToArray(value);
    if (!this.soldItemIds[0]) throw new CustomError("Invalid input 'Order Items' format");
  }
  set _carrier(value) {
    if (Validator.isUrl(value)) this.carrier = value;
    else throw new CustomError("Invalid input 'Carrier WebSite'");
  }
  set _trackNumber(value) {
    if (Validator.isString(value, 10)) this.trackNumber = value;
    else throw new CustomError("Invalid input 'Tracking Number'");
  }
}
module.exports = CreateShipmentCommand;
