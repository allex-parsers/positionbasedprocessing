function createLib (execlib) {
  return execlib.loadDependencies('client', ['allex:extractionbuffer:parser'], createPositionBasedRecordProcessor.bind(null, execlib));
}

function createPositionBasedRecordProcessor (execlib, DoubleBufferWithCursor) {
  'use strict';
  var lib = execlib.lib;

  function PositionBasedRecordProcessor (type, delimiter) {
    this.isText = null;
    this.recordDelimiter = null;
    this.doubleBuffer = null;
    if (type !== 'text' && type !== 'buffer') {
      throw new lib.Error('WRONG_POSITION_BASED_PROCESSOR_TYPE', 'PositionBasedRecordProcessor ctor got type '+type+', it must be `text` or `buffer`');
    }
    this.isText = type==='text';
    if (this.isText) {
      this.recordDelimiter = new Buffer('\n');
    } else {
      if (!Buffer.isBuffer(delimiter)) {
        throw new lib.Error('NO_BUFFER_DELIMITER', 'PositionBasedRecordProcessor ctor must get a delimiter that is a Buffer');
      }
      this.recordDelimiter = delimiter;
    }
  }
  PositionBasedRecordProcessor.prototype.destroy = function () {
    if (this.doubleBuffer) {
      this.doubleBuffer.destroy();
    }
    this.doubleBuffer = null;
    this.recordDelimiter = null;
    this.isText = null;
  };

  PositionBasedRecordProcessor.prototype.isFixedLength = function () {
    return lib.isNumber(this.recordDelimiter);
  };

  PositionBasedRecordProcessor.prototype.fileToData = function (data) {
    if (this.isFixedLength()) {
      return [];
    }
    return this.ensureForDoubleBuffer().process(data);
  };

  PositionBasedRecordProcessor.prototype.ensureForDoubleBuffer = function () {
    if (!this.doubleBuffer) {
      this.doubleBuffer = new DoubleBufferWithCursor(this);
    }
    return this.doubleBuffer;
  };

  PositionBasedRecordProcessor.prototype.createBuffer = function (data) {
    var ret;
    if (this.isText) {
      ret = {};
      lib.traverse(this.fieldDescriptor, this.createFileToDataItem.bind(this, data, ret));
      return ret;
    }
  };

  PositionBasedRecordProcessor.prototype.createFileToDataItem = function (inputbuffer, resulthash, fieldprocessor, fieldprocessorname) {
    var range, rangelen, align, item;
    range = fieldprocessor.range;
    if (!range) {
      resulthash[fieldprocessorname] = null;
      return;
    }
    rangelen = range[1]-range[0];
    align = fieldprocessor.align;
    item = inputbuffer.toString('utf8', range[0], range[1]).trim();
    if(!align && item.length!==rangelen){
      throw new lib.Error('FIELD_WITHOUT_ALIGN_MUST_HAVE_FULL_LENGTH','Field that should have been '+rangelen+' long turned out to be '+item.length+' long');
    }
    resulthash[fieldprocessorname] = item;
  };

  PositionBasedRecordProcessor.prototype.finalize = function () {
    if (this.doubleBuffer) { //i.e. if this.isText
      return this.doubleBuffer.finalize();
    }
  };

  PositionBasedRecordProcessor.addMethods = function (klass) {
    lib.inheritMethods(klass, PositionBasedRecordProcessor, 
      'fileToData',
      'createBuffer',
      'createFileToDataItem',
      'finalize',
      'isFixedLength',
      'ensureForDoubleBuffer'
    );
  };


  return PositionBasedRecordProcessor;
}

module.exports = createLib;
