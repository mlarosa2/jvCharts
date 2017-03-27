(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
//purpose of this file is to attach jv charts objects to the window

var jvCharts = require('./jvCharts.js');
var jvBrush = require('./jvBrush.js');
var jvComment = require('./jvComment.js');
var jvEdit = require('./jvEdit.js');
var jvSelect = require('./jvSelect');

window.jvCharts = jvCharts;
window.jvBrush = jvBrush;
window.jvComment = jvComment;
window.jvEdit = jvEdit;
window.jvSelect = jvSelect;

},{"./jvBrush.js":2,"./jvCharts.js":3,"./jvComment.js":4,"./jvEdit.js":5,"./jvSelect":6}],2:[function(require,module,exports){
'use strict';

/***  jvBrush ***/
function jvBrush(configObj) {
    'use strict';

    var brushObj = this;
    brushObj.chartDiv = configObj.chartDiv;
    brushObj.brushDiv = '';
    brushObj.jvChart = configObj.jvChart;
    brushObj.disabled = false;
    brushObj.toggleBrushMode = function (toggleBool) {
        if (toggleBool) {
            brushObj.startBrush();
        } else {
            brushObj.removeBrush();
        }
    };
    brushObj.filterCallbackFunction = configObj.filterCallbackFunction;
}

/********************************************* All Brush Mode Functions **************************************************/

jvBrush.prototype.removeBrush = function () {
    var brushObj = this,
        svg = brushObj.jvChart.svg;

    svg.selectAll('.brusharea').remove();
};

jvBrush.prototype.startBrush = function () {
    var brushObj = this,
        height = brushObj.jvChart.config.container.height,
        width = brushObj.jvChart.config.container.width,
        svg = brushObj.jvChart.svg;

    if (brushObj.jvChart.config.type === 'singleaxis') {
        brushObj.brushType = 'x';
        svg.append('g').attr('class', 'brusharea').style('height', height + 'px').style('width', width + 'px').call(d3.brushX().extent([[0, 0], [width, height]]).on('end', brushEnd));
    } else {
        brushObj.brushType = 'xy';
        svg.append('g').attr('class', 'brusharea').style('height', height + 'px').style('width', width + 'px').call(d3.brush().extent([[0, 0], [width, height]]).on('end', brushEnd));
    }

    /**brushEnd
     * @desc - function called at the end of the user brushing
     */
    function brushEnd() {
        var xScale = brushObj.jvChart.currentData.xAxisScale,
            yScale = brushObj.jvChart.currentData.yAxisScale,
            filteredXAxisLabels = [],
            filteredYAxisLabels = [],
            shouldReset = false,
            e = d3.event.selection,
            returnObj,
            filteredLabels = [],
            filteredConcepts = {},
            index,
            filterCol,
            filteredLabelsX,
            filteredLabelsY;

        if (e) {
            if (brushObj.brushType === 'xy') {
                if (xScale && typeof xScale.invert !== 'function') {
                    //means that the scale is ordinal and not linear
                    returnObj = calculateBrushAreaOrdinal(e[0][0], e[1][0], xScale);
                    filteredXAxisLabels = returnObj.filteredAxisLabels;
                    shouldReset = returnObj.shouldReset;
                } else if (xScale) {
                    //calculate labels for linear scale
                    returnObj = calculateBrushAreaLinear(e[0][0], e[1][0], xScale, brushObj.jvChart.currentData, brushObj.jvChart.config.type, 'x');
                    filteredXAxisLabels = returnObj.filteredAxisLabels;
                    shouldReset = returnObj.shouldReset;
                }

                if (yScale && typeof yScale.invert !== 'function') {
                    //means that the scale is oridnal and not linear
                    returnObj = calculateBrushAreaOrdinal(e[0][1], e[1][1], yScale);
                    filteredYAxisLabels = returnObj.filteredAxisLabels;
                    if (returnObj.shouldReset) {
                        shouldReset = true;
                    }
                } else if (yScale) {
                    //calculate labels for linear scale
                    returnObj = calculateBrushAreaLinear(e[0][1], e[1][1], yScale, brushObj.jvChart.currentData, brushObj.jvChart.config.type, 'y');
                    filteredYAxisLabels = returnObj.filteredAxisLabels;
                    if (returnObj.shouldReset) {
                        shouldReset = true;
                    }
                } else if (brushObj.jvChart.config.type === 'cloud') {
                    returnObj = calculateCloudBrush(e, brushObj.jvChart.currentData);
                    filteredYAxisLabels = returnObj.filteredAxisLabels;
                    if (returnObj.shouldReset) {
                        shouldReset = true;
                    }
                } else if (brushObj.jvChart.config.type === 'heatmap') {
                    returnObj = calculateHeatmapBrush(e, brushObj.jvChart.currentData, brushObj.jvChart.config.margin);
                    filteredLabelsX = returnObj.filteredXAxisLabels;
                    filteredLabelsY = returnObj.filteredYAxisLabels;
                    if (returnObj.shouldReset) {
                        shouldReset = true;
                    }
                }
            } else if (brushObj.brushType === 'x') {
                returnObj = calculateBrushAreaLinear(e[0], e[1], xScale, brushObj.jvChart.currentData, brushObj.jvChart.config.type, 'x');
                filteredXAxisLabels = returnObj.filteredAxisLabels;
                if (returnObj.shouldReset) {
                    shouldReset = true;
                }
            }
        } else {
            shouldReset = true;
        }

        if (filteredXAxisLabels.length > 0 && filteredYAxisLabels.length > 0) {
            //merge axisLabels
            for (var j = 0; j < filteredXAxisLabels.length; j++) {
                index = filteredYAxisLabels.indexOf(filteredXAxisLabels[j]);
                if (index > -1) {
                    filteredLabels.push(filteredXAxisLabels[j]);
                }
            }
        } else if (filteredXAxisLabels.length > 0) {
            filteredLabels = filteredXAxisLabels;
        } else if (filteredYAxisLabels.length > 0) {
            filteredLabels = filteredYAxisLabels;
        }

        if (brushObj.jvChart.config.type === 'heatmap') {
            if (!shouldReset) {
                var filterColX = brushObj.jvChart.currentData.dataTable.x;
                var filterColY = brushObj.jvChart.currentData.dataTable.y;
                if (filteredLabelsX.length > 0) {
                    filteredConcepts[filterColX] = filteredLabelsX;
                }
                if (filteredLabelsY.length > 0) {
                    filteredConcepts[filterColY] = filteredLabelsY;
                }
            }
        } else {
            filterCol = brushObj.jvChart.currentData.dataTable.label;
        }
        filteredConcepts[filterCol] = filteredLabels;

        //calls back to update data with brushed data
        brushObj.filterCallbackFunction(filteredConcepts, shouldReset);
    }
};

/**calculateBrushAreaOrdinal
 *
 * @param mousePosMin
 * @param mousePosMax
 * @param scale
 * @returns Object
 * @desc calculates the ordinal values that are in the brushed area
 */
function calculateBrushAreaOrdinal(mousePosMin, mousePosMax, scale) {
    var domain = scale.domain(),
        padding = scale.padding(),
        step = scale.step(),
        minIndex,
        maxIndex,
        paddingDistance = padding * step / 2,
        filteredAxisLabels;

    //determine min index
    if (mousePosMin % step > step - paddingDistance) {
        //don't include on min side
        minIndex = Math.floor(mousePosMin / step) + 1;
    } else {
        //include on min side
        minIndex = Math.floor(mousePosMin / step);
    }

    //determine max index
    if (mousePosMax % step < paddingDistance) {
        //don't include on max side
        maxIndex = Math.floor(mousePosMax / step) - 1;
    } else {
        //include on max side
        maxIndex = Math.floor(mousePosMax / step);
        if (maxIndex === domain.length) {
            maxIndex -= 1;
        }
    }

    filteredAxisLabels = domain.slice(minIndex, maxIndex + 1);

    return { filteredAxisLabels: filteredAxisLabels, shouldReset: filteredAxisLabels.length === 0 };
}

/**calculateBrushAreaOrdinal
 *
 * @param mousePosMin
 * @param mousePosMax
 * @param scale
 * @param data chartData
 * @param type visual type
 * @param axis - x / y
 * @returns Object
 * @desc calculates the ordinal values that are in the brushed area
 */
function calculateBrushAreaLinear(mousePosMin, mousePosMax, scale, data, type, axis) {
    var filteredAxisLabels = [],
        min,
        max,
        axisLabel;

    //switch min and max if scale is y due to svg drawing (y axis increases up the screen while mousePos decreases)
    if (axis === 'y') {
        max = scale.invert(mousePosMin);
        min = scale.invert(mousePosMax);
    } else {
        min = scale.invert(mousePosMin);
        max = scale.invert(mousePosMax);
    }

    if (type === 'bar') {
        for (var i = 0; i < data.legendData.length; i++) {
            axisLabel = data.legendData[i];
            for (var j = 0; j < data.chartData.length; j++) {
                if (data.chartData[j][axisLabel] >= min) {
                    filteredAxisLabels.push(data.chartData[j][data.dataTable.label]);
                }
            }
        }
    } else if (type === 'line' || type === 'area' || type === 'singleaxis') {
        for (var i = 0; i < data.legendData.length; i++) {
            axisLabel = data.legendData[i];
            for (var j = 0; j < data.chartData.length; j++) {
                if (data.chartData[j][axisLabel] <= max && data.chartData[j][axisLabel] >= min) {
                    filteredAxisLabels.push(data.chartData[j][data.dataTable.label]);
                }
            }
        }
    } else if (type === 'scatterplot') {
        axisLabel = data.dataTable[axis];
        for (var j = 0; j < data.chartData.length; j++) {
            if (data.chartData[j][axisLabel] <= max && data.chartData[j][axisLabel] >= min) {
                filteredAxisLabels.push(data.chartData[j][data.dataTable.label]);
            }
        }
    } else if (type === 'heatmap') {
        axisLabel = data.dataTable[axis];
        for (var j = 0; j < data.chartData.length; j++) {
            if (data.chartData[j][axisLabel] <= max && data.chartData[j][axisLabel] >= min) {
                filteredAxisLabels.push(data.chartData[j][data.dataTable.label]);
            }
        }
    }

    return { filteredAxisLabels: filteredAxisLabels, shouldReset: filteredAxisLabels.length === 0 };
}

function calculateCloudBrush(e, data) {
    for (var i = 0; i < data.length; i++) {
        var d = data[i];
        var mouseX0 = e[0][0];
        var mouseX1 = e[0][1];
        var mouseY0 = e[1][0];
        var mouseY1 = e[1][1];
    }

    return [];
}

function calculateHeatmapBrush(e, data) {
    var mouseXmin = e[0][0];
    var mouseYmin = e[0][1];
    var mouseXmax = e[1][0];
    var mouseYmax = e[1][1];
    var filteredXAxisLabels = [];
    var filteredYAxisLabels = [];
    var filteredData = [];
    var reset = true;

    for (var i = 0; i < mouseXmax / 20; i++) {
        if (i >= mouseXmin / 20) {
            filteredXAxisLabels.push(data.xAxisData.values[i]);
            reset = false;
        }
    }
    for (var i = 0; i < mouseYmax / 20; i++) {
        if (i >= mouseYmin / 20) {
            filteredYAxisLabels.push(data.yAxisData.values[i]);
            reset = false;
        }
    }

    //Might need when new PKQL pixel... comes out
    // for (var i = 0; i < data.chartData.length; i++) {
    //     var d = data.chartData[i];
    //     if(filteredXAxisLabels.includes(d[data.dataTable.x]) && filteredYAxisLabels.includes(d[data.dataTable.y])) {
    //         filteredDataX.push(d[data.dataTable.x]);
    //         filteredDataY.push(d[data.dataTable.y]);
    //     }
    // }

    return { filteredXAxisLabels: filteredXAxisLabels, filteredYAxisLabels: filteredYAxisLabels, shouldReset: reset };
}

module.exports = jvBrush;

},{}],3:[function(require,module,exports){
'use strict';
/***  jvCharts ***/

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var jvTip = require('./jvTip.js');

/**Create a jvCharts object
 * @constructor
 * @param {Object} configObj - Configuration object passed into jvCharts constructor
 * @param {string} configObj.type - The type of chart
 * @param {string} configObj.name - The name of the chart
 * @param {Object} configObj.container - The container of the chart
 * @param {Object} configObj.options - UI options for the chart
 * @param {Object} configObj.tipConfig - Configuration object for jvTooltip
 * @param {Object} configObj.chartDiv - A div wrapper for the chart and other jv features
 */

var jvCharts = function () {
    function jvCharts(configObj) {
        _classCallCheck(this, jvCharts);

        var chart = this;
        chart.config = {
            type: configObj.type.toLowerCase(),
            name: configObj.name,
            container: configObj.container
        };

        chart.chartDiv = configObj.chartDiv;
        chart.localCallbackRelatedInsights = configObj.localCallbackRelatedInsights;
        chart.options = cleanToolData(configObj.options);
        chart.vars = chart.getDefaultOptions();

        if (configObj.hasOwnProperty('infiniteScrollFunc')) {
            chart.infiniteScrollFunc = configObj.infiniteScrollFunc;
        }

        if (configObj.hasOwnProperty('sortColumnFunc')) {
            chart.sortColumnFunc = configObj.sortColumnFunc;
        }

        chart.tip = new jvTip({
            type: configObj.tipConfig.type,
            chartDiv: configObj.chartDiv
        });

        chart.showComments = false;
        chart.draw = {};
        chart.draw.showToolTip = true;
        chart.currentData = {};

        chart.toggleDefaultMode = function (toggleBool) {
            if (toggleBool) {
                var entireSvg = chart.chartDiv.select('.editable-svg');
                entireSvg.on('dblclick', function () {
                    if (typeof chart.localCallbackRelatedInsights === 'function') {
                        chart.localCallbackRelatedInsights();
                    }
                });
                entireSvg.on('click', false);
                chart.draw.showToolTip = true;
            } else {
                chart.draw.showToolTip = false;
                chart.removeHighlight();
            }
        };

        if (configObj.setData) {
            chart.data = { chartData: configObj.setData.data, dataTable: configObj.setData.dataTable, dataTableKeys: configObj.setData.dataTableKeys };
            chart.colors = configObj.setData.colors;
            if (configObj.setData.additionalInfo) {
                chart.data.additionalInfo = configObj.setData.additionalInfo;
            }
            if (configObj.setData.markerType) {
                chart.data.markerType = configObj.setData.markerType;
            }
            chart[chart.config.type].setData(chart, configObj.setData);
        }

        if (_typeof(chart[chart.config.type]) === 'object' && typeof chart[chart.config.type].paint === 'function') {
            chart[chart.config.type].paint(chart);
        } else {
            console.log('no paint function for: ' + chart.config.type);
        }
    }
    // end of constructor

    _createClass(jvCharts, [{
        key: 'setAxisData',
        value: function setAxisData(axis, data, keys) {
            var chart = this;
            var axisData = [];
            var chartData = data.chartData;
            var label = '';
            var maxStack = 0;
            var options = chart.options,
                dataTableKeys = data.dataTableKeys,
                dataType;

            if (!dataTableKeys) {
                dataTableKeys = keys;
            }

            //Step 1: find out what the label is for the axis
            if (axis === 'x') {
                if (data.dataTable) {
                    if (data.dataTable.hasOwnProperty('label')) {
                        label = data.dataTable.label;
                    } else {
                        console.error("Label doesn't exist in dataTable");
                    }
                } else {
                    console.log('DataTable does not exist');
                }

                dataType = 'STRING';

                //Replace underscores with spaces
                label = label.replace(/_/g, ' ');

                //loop through data to populate axisData
                for (var i = 0; i < chartData.length; i++) {
                    if (chartData[i][label] === null) {
                        axisData.push('NULL_VALUE');
                    } else if (chartData[i][label] === '') {
                        axisData.push('EMPTY_STRING');
                    } else if (chartData[i][label] || chartData[i][label] === 0) {
                        axisData.push(chartData[i][label]);
                    }
                }
            } else {
                //Find the max value for Y Data
                for (var i = 0; i < dataTableKeys.length; i++) {
                    if (dataTableKeys[i].vizType !== 'label') {
                        label = dataTableKeys[i].varKey;
                    }
                }

                dataType = getDataTypeFromKeys(label, dataTableKeys);

                //Add all values that are on yaxis to axis data
                for (var i = 0; i < chartData.length; i++) {
                    var stack = 0; //Keeps track of the maximum size of stacked data so that axis can be scaled to fit max size
                    for (var k in data.dataTable) {
                        if (chartData[i].hasOwnProperty(data.dataTable[k]) && k !== 'label') {
                            stack += chartData[i][data.dataTable[k]];
                            axisData.push(chartData[i][data.dataTable[k]]);
                        }
                    }
                    if (stack > maxStack) {
                        maxStack = stack;
                    }
                }
                //Replace underscores with spaces since label is retrieved from dataTableKeys
                label = label.replace(/_/g, ' ');
            }

            //Find the min and max of numeric data for building axes and add it to the returned object
            if (dataType === 'NUMBER') {
                if (chart.options.stackToggle) {
                    var max = maxStack;
                } else {
                    var max = Math.max.apply(null, axisData);
                }

                var min = Math.min.apply(null, axisData);
                min = Math.min(0, min);

                //Check if there's an axis min/max set
                if (axis === 'x') {
                    if (options.xMin != null && options.xMin !== 'none') {
                        min = options.xMin;
                    }
                    if (options.xMax != null && options.xMax !== 'none') {
                        max = options.xMax;
                    }
                } else if (axis === 'y') {
                    if (options.yMin != null && options.yMin !== 'none') {
                        min = options.yMin;
                    }
                    if (options.yMax != null && options.yMax !== 'none') {
                        max = options.yMax;
                    }
                }

                if (dataType === 'NUMBER' && axisData.length === 1) {
                    if (axisData[0] >= 0) {
                        axisData.unshift(0);
                    } else {
                        axisData.push(0);
                    }
                }

                return {
                    'label': label,
                    'values': axisData,
                    'dataType': dataType,
                    'min': min,
                    'max': max
                };
            }

            return {
                'label': label,
                'values': axisData,
                'dataType': dataType
            };
        }

        /**setFlippedSeries
         *  flips series and returns flipped data
         *
         * @params chartData, dataTable, dataLabel
         * @returns Object of data and table for flipped series
         */

    }, {
        key: 'setFlippedSeries',
        value: function setFlippedSeries(dataTableKeys) {
            var chart = this;
            var chartData = chart.data.chartData;
            var dataTable = chart.data.dataTable;
            var dataLabel = chart.data.xAxisData.label;

            var flippedData = [];
            var flippedDataTable = {};
            var valueCount = 1;
            var filteredDataTableArray = [];

            for (var k in dataTable) {
                if (dataTable.hasOwnProperty(k)) {
                    var flippedObject = {};
                    if (dataTable[k] !== dataLabel) {
                        flippedObject[dataLabel] = dataTable[k];
                        for (var i = 0; i < chartData.length; i++) {
                            flippedObject[chartData[i][dataLabel]] = chartData[i][dataTable[k]];
                            if (filteredDataTableArray.indexOf(chartData[i][dataLabel]) === -1) {
                                flippedDataTable['value ' + valueCount] = chartData[i][dataLabel];
                                valueCount++;
                                filteredDataTableArray.push(chartData[i][dataLabel]);
                            }
                        }
                        flippedData.push(flippedObject);
                    }
                }
            }
            flippedDataTable.label = dataLabel;
            chart.flippedData = { chartData: flippedData, dataTable: flippedDataTable };

            if (chart.config.type === 'bar' || chart.config.type === 'line' || chart.config.type === 'area') {
                chart.flippedData.xAxisData = chart.setAxisData('x', chart.flippedData, dataTableKeys);
                chart.flippedData.yAxisData = chart.setAxisData('y', chart.flippedData, dataTableKeys);
                chart.flippedData.legendData = setBarLineLegendData(chart.flippedData);
            } else {
                console.log('Add additional chart type to set flipped series');
            }
        }

        /**organizeChartData
         *  reorders all data based on the sortLabel and sortType
         *  -Only for chartData, does not work with flipped data
         *
         * @params sortLabel , sortType
         * @returns [] sorted data
         */

    }, {
        key: 'organizeChartData',
        value: function organizeChartData(sortParam, sortType) {
            var chart = this,
                organizedData,
                dataType,
                dataTableKeys = chart.data.dataTableKeys,
                sortLabel = sortParam;

            //If sortLabel doesn't exist, sort on the x axis label by default
            if (sortLabel === 'none') {
                for (var i = 0; i < dataTableKeys.length; i++) {
                    if (dataTableKeys[i].vizType === 'label') {
                        sortLabel = dataTableKeys[i].uri;
                        break;
                    }
                }
            }

            //Remove underscores from sortLabel
            sortLabel = sortLabel.replace(/_/g, ' ');

            if (!chart.data.chartData[0][sortLabel]) {
                //Check if the sort label is a calculatedBy field
                var isValidSortLabel = false;
                for (var i = 0; i < dataTableKeys.length; i++) {
                    var obj1 = dataTableKeys[i];
                    if (obj1.operation.hasOwnProperty('calculatedBy') && obj1.operation.calculatedBy[0] === sortLabel) {
                        sortLabel = obj1.uri.replace(/_/g, ' ');
                        isValidSortLabel = true;
                        break;
                    }
                }
                //If it's not a valid sort label, return and don't sort the data
                if (!isValidSortLabel) {
                    console.error('Not a valid sort');
                    return;
                }
            }

            //Check the data type to determine which logic to flow through
            for (var i = 0; i < dataTableKeys.length; i++) {
                var obj = dataTableKeys[i];
                //Loop through dataTableKeys to find sortLabel
                if (obj.uri.replace(/_/g, ' ') === sortLabel) {
                    dataType = obj.type;
                    break;
                }
            }

            //Date sorting
            if (dataType != null && dataType === 'DATE') {
                organizedData = chart.data.chartData.sort(function (a, b) {
                    var c = new Date(a[sortLabel]);
                    var d = new Date(b[sortLabel]);
                    return c - d;
                });
            } else if (dataType != null && dataType === 'NUMBER') {
                organizedData = chart.data.chartData.sort(function (a, b) {
                    if (!isNaN(a[sortLabel]) && !isNaN(b[sortLabel])) {
                        return a[sortLabel] - b[sortLabel];
                    }
                });
            } else {
                organizedData = chart.data.chartData.sort(function (a, b) {
                    if (!isNaN(a[sortLabel]) && !isNaN(b[sortLabel])) {
                        if (parseFloat(a[sortLabel]) < parseFloat(b[sortLabel])) {
                            //sort string ascending
                            return -1;
                        }
                        if (parseFloat(a[sortLabel]) > parseFloat(b[sortLabel])) {
                            return 1;
                        }
                        return 0;
                    }
                    if (a[sortLabel].toLowerCase() < b[sortLabel].toLowerCase()) {
                        //sort string ascending
                        return -1;
                    }
                    if (a[sortLabel].toLowerCase() > b[sortLabel].toLowerCase()) {
                        return 1;
                    }
                    return 0;
                });
            }

            switch (sortType) {
                case 'sortAscending':
                case 'ascending':
                    chart.data.chartData = organizedData;
                    break;
                case 'sortDescending':
                case 'descending':
                    chart.data.chartData = organizedData.reverse();
                    break;
                default:
                    chart.data.chartData = organizedData;
            }
        }

        /**setTipData
         *
         * creates data object to display in tooltip
         * @params
         * @returns {{}}
         */

    }, {
        key: 'setTipData',
        value: function setTipData(d, i) {
            var chart = this,
                data = chart.currentData.chartData;

            //Get Color from chartData and add to object
            var color = chart.options.color;

            var title = d[chart.data.dataTable.label];
            var dataTable = {};

            if (chart.config.type === 'treemap') {
                for (var item in d) {
                    if (item === chart.data.dataTable.series || item === chart.data.dataTable.size) {
                        dataTable[item] = d[item];
                    } else {
                        continue;
                    }
                }
            } else if (chart.config.type === 'bar' || chart.config.type === 'line' || chart.config.type === 'area') {
                title = data[i][chart.data.dataTable.label];
                for (var item in data[i]) {
                    if (item !== chart.data.dataTable.label) {
                        dataTable[item] = data[i][item];
                    } else {
                        continue;
                    }
                }
            } else if (chart.config.type === 'gantt') {
                //Calculate length of dates
                for (item in data[i]) {
                    if (data[i].hasOwnProperty(item) && item !== chart.data.dataTable.group) {
                        dataTable[item] = data[i][item];
                    }
                }

                var start, end, difference;

                //Calculting duration of date ranges to add to tooltip
                var numPairs = Math.floor(Object.keys(chart.data.dataTable).length / 2);
                for (var j = 1; j <= numPairs; j++) {
                    start = new Date(data[i][chart.data.dataTable['start ' + j]]);
                    end = new Date(data[i][chart.data.dataTable['end ' + j]]);
                    difference = end.getTime() - start.getTime();
                    dataTable['Duration ' + j] = Math.ceil(difference / (1000 * 60 * 60 * 24)) + ' days';
                }

                title = data[i][chart.data.dataTable.group];
            } else if (chart.config.type === 'pie' || chart.config.type === 'radial') {
                title = d.label;
                for (var item in d) {
                    if (item !== 'label') {
                        dataTable[item] = d[item];
                    } else {
                        continue;
                    }
                }
                delete dataTable.outerRadius;
            } else if (chart.config.type === 'circlepack' || chart.config.type === 'sunburst') {
                title = d.data.name;
                dataTable[chart.data.dataTable.value] = d.value;
            } else if (chart.config.type === 'cloud') {
                title = d[chart.data.dataTable.label];
                dataTable[chart.data.dataTable.value] = d[chart.data.dataTable.value];
            } else if (chart.config.type === 'heatmap') {
                title = d.yAxisName + ' to ' + d.xAxisName;
                if (d.hasOwnProperty('value')) {
                    dataTable.value = d.value;
                }
            } else if (chart.config.type === 'sankey') {
                title = d.source.name + ' to ' + d.target.name;
                if (d.hasOwnProperty('value')) {
                    dataTable.value = d.value;
                }
            } else if (chart.config.type === 'singleaxis') {
                title = d.data[chart.data.dataTable.label];

                for (var item in chart.data.dataTable) {
                    if (item != 'label') {
                        dataTable[chart.data.dataTable[item]] = d.data[chart.data.dataTable[item]];
                    }
                }
            } else {
                for (var item in d) {
                    if (item !== chart.data.dataTable.label) {
                        dataTable[item] = d[item];
                    } else {
                        continue;
                    }
                }
            }

            return { 'data': d, 'tipData': dataTable, 'index': i, 'title': title, 'color': color, 'viz': chart.config.type };
        }

        /************************************************ Draw functions ******************************************************/

        /**generateSVG
         *creates an SVG element on the panel
         *
         * @params container, margin, name
         *
         */

    }, {
        key: 'generateSVG',
        value: function generateSVG(legendData, customMarginParam, customSizeParam) {
            var chart = this,
                margin = {},
                container = {},
                dimensions = chart.chartDiv.node().getBoundingClientRect(),
                customMargins = customMarginParam,
                customSize = customSizeParam,
                textWidth;

            if (chart.options.customMargins) {
                customMargins = chart.options.customMargins;
            }

            //set margins
            if (!customMargins) {
                //declare margins if they arent passed in
                margin = {
                    top: 55,
                    right: 50,
                    left: 100,
                    bottom: 70
                };
                if (legendData != null) {
                    if (legendData.length <= 3) {
                        margin.bottom = 70;
                    } else if (legendData.length <= 6) {
                        margin.bottom = 85;
                    } else {
                        margin.bottom = 130;
                    }
                }
            } else {
                margin = customMargins;
            }

            //reduce margins if legend is toggled off
            //TODO make this better
            if (chart.options.hasOwnProperty('toggleLegend') && !chart.options.toggleLegend) {
                if (chart.config.type === 'pie' || chart.config.type === 'radial' || chart.config.type === 'circlepack' || chart.config.type === 'heatmap') {
                    margin.left = 40;
                } else if (chart.config.type === 'treemap' || chart.config.type === 'bar' || chart.config.type === 'gantt' || chart.config.type === 'scatter' || chart.config.type === 'line') {
                    margin.bottom = 40;
                }
            }

            //set yAxis margins
            if (chart.currentData && chart.currentData.yAxisData) {
                textWidth = getMaxWidthForAxisData('y', chart.currentData.yAxisData, chart.options, dimensions, margin, chart.chartDiv, chart.config.type);
                margin.left = Math.ceil(textWidth) + 20;
            }

            //set xAxis top margins
            if (chart.config.type === 'heatmap' && chart.currentData && chart.currentData.xAxisData) {
                textWidth = getMaxWidthForAxisData('x', chart.currentData.xAxisData, chart.options, dimensions, margin, chart.chartDiv, chart.config.type);
                //subtract space for tilt
                textWidth = Math.ceil(textWidth);
                if (textWidth > 100) {
                    textWidth = 120;
                }
                margin.top = Math.ceil(textWidth);
                customSize = {};
                //set container
                customSize.width = chart.currentData.xAxisData.values.length * 20;
                customSize.height = chart.currentData.yAxisData.values.length * 20;
                if (customSize.width < dimensions.width) {
                    margin.right = parseInt(dimensions.width) - margin.left - customSize.width - 10;
                }
                if (customSize.height < dimensions.height) {
                    margin.bottom = parseInt(dimensions.height) - margin.top - customSize.height - 10;
                }
            }

            //set container attributes
            //Set svg size based on calculation margins or custom size if specified
            if (customSize && customSize.hasOwnProperty('height')) {
                container.height = customSize.height;
            } else {
                container.height = parseInt(dimensions.height) - margin.top - margin.bottom;
            }

            if (customSize && customSize.hasOwnProperty('width')) {
                container.width = customSize.width;
            } else {
                container.width = parseInt(dimensions.width) - margin.left - margin.right;
            }

            //add margin and container to chart config object
            chart.config.margin = margin;
            chart.config.container = container;

            //remove old svg if it exists
            chart.svg = chart.chartDiv.select('svg').remove();

            //svg layer
            if (chart.config.type === 'heatmap' || chart.config.type === 'singleaxis') {
                chart.svg = chart.chartDiv.append('svg').attr('class', 'editable-svg').attr('width', container.width + margin.left + margin.right).attr('height', container.height + margin.top + margin.bottom).append('g').attr('class', 'container').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            } else {
                chart.svg = chart.chartDiv.append('svg').attr('class', 'full-width full-height editable-svg').attr('width', container.width + margin.left + margin.right).attr('height', container.height + margin.top + margin.bottom).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            }

            //TODO move to edit mode
            if (chart.options.hasOwnProperty('backgroundColor')) {
                chart.colorBackground(chart.options.backgroundColor);
            }
        }

        /**generateXAxis
         * creates x axis on the svg
         *
         * @params xAxisData
         */

    }, {
        key: 'generateXAxis',
        value: function generateXAxis(xAxisData, ticks) {
            //declare variables
            var chart = this,
                xAxis,

            //Need to getXAxisScale each time so that axis updates on resize
            xAxisScale = jvCharts.getAxisScale('x', xAxisData, chart.config.container, chart.options),
                containerHeight = chart.config.container.height,
                containerWidth = chart.config.container.width,
                xAxisClass = 'xAxisLabels editable editable-xAxis editable-text';

            //assign css class for edit mode
            //if the axis is numbers add editable-num
            if (xAxisData.dataType === 'NUMBER') {
                xAxisClass += ' editable-num';
            }

            //remove previous xAxis container if its there
            chart.svg.selectAll('.xAxisContainer').remove();

            //Save the axis scale to chart object
            chart.currentData.xAxisScale = xAxisScale;

            var tickSize = 0;
            if (chart.currentData.xAxisData.dataType === 'NUMBER') {
                tickSize = 5;
            }

            //create xAxis drawing function
            if (chart.config.type === 'singleaxis') {
                xAxis = d3.axisTop(xAxisScale).tickSize(tickSize);
            } else {
                xAxis = d3.axisBottom(xAxisScale).tickSize(tickSize);
            }

            if (ticks) {
                xAxis.ticks(ticks);
            }

            var axisHeight = containerHeight;
            if (chart.config.type === 'singleaxis') {
                //For any axes that are on top of the data
                axisHeight = 0;
            }

            var xContent = chart.svg.append('g').attr('class', 'xAxisContainer').attr('transform', 'translate(0,' + axisHeight + ')');

            var xAxisGroup = xContent.append('g').attr('class', 'xAxis').transition().duration(0).call(xAxis);

            var formatValueType = jvFormatValueType(xAxisData.values);

            //Styling the axis
            xAxisGroup.select('path').attr('stroke', chart.vars.axisColor).attr('stroke-width', chart.vars.strokeWidth);

            //Styling for ticks
            xAxisGroup.selectAll('line').attr('stroke', chart.vars.axisColor).attr('stroke-width', chart.vars.stroke);

            //Styling the labels for each piece of data
            xAxisGroup.selectAll('text').attr('fill', chart.vars.black) //Customize the color of axis labels
            .attr('class', xAxisClass).style('text-anchor', 'middle').attr('font-size', chart.options.fontSize).attr('transform', 'translate(0, 3)').text(function (d) {
                if (xAxisData.dataType === 'NUMBER' || chart.options.rotateAxis) {
                    return jvFormatValue(d, formatValueType);
                }
                return d;
            });

            //Styling the label for the entire axis
            xContent.append('g').attr('class', 'xLabel').append('text').attr('class', 'xLabel editable editable-text editable-content').attr('text-anchor', 'middle').attr('font-size', chart.options.fontSize).text(function () {
                if (xAxisData.dataType === 'DATE') {
                    return '';
                }
                return xAxisData.label;
            }).attr('transform', 'translate(' + containerWidth / 2 + ', 33)');
        }

        /**FormatXAxisLabels
         *
         * If x-axis labels are too long/overlapping, they will be hidden/shortened
         */

    }, {
        key: 'formatXAxisLabels',
        value: function formatXAxisLabels(dataLength, recursion) {
            var chart = this,
                showAxisLabels = true,
                xAxisLength = chart.config.container.width,
                textWidth = [],
                formatValueType = null,
                dataType = chart.currentData.xAxisData.dataType,
                axisValues = chart.currentData.xAxisData.values;

            if (dataType === 'NUMBER') {
                formatValueType = jvFormatValueType(axisValues);
            }

            //create dummy text to determine computed text length for the axis labels
            //necessary to do this because axis labels getBBox() is returning 0 since they do not seem to be drawn yet
            chart.svg.append('g').selectAll('.dummyText').data(axisValues).enter().append('text').attr('font-family', 'sans-serif').attr('font-size', chart.options.fontSize).text(function (d) {
                var returnVal = d;
                if (dataType === 'NUMBER') {
                    returnVal = jvFormatValue(d, formatValueType);
                }
                return returnVal;
            }).each(function () {
                //adding 10px buffer
                var thisWidth = this.getComputedTextLength() + 10;
                textWidth.push(thisWidth);
                this.remove(); //remove them just after displaying them
            });

            for (var i = 0; i < textWidth.length; i++) {
                var textEleWidth = textWidth[i];
                if (textEleWidth > xAxisLength / dataLength) {
                    showAxisLabels = false;
                }
            }

            if (showAxisLabels) {
                if (recursion) {
                    chart.generateXAxis(chart.currentData.xAxisData, dataLength);
                }
                chart.svg.selectAll('.xAxisLabels').style('display', 'block');
            } else if (dataLength > 1 && chart.currentData.xAxisData.dataType === 'NUMBER') {
                //recursively keep decreasing to figure out ticks length to repaint the xAxis if its numeric
                chart.formatXAxisLabels(dataLength - 1, true);
            } else {
                chart.svg.selectAll('.xAxis').selectAll('text').style('display', 'none');
            }
        }

        /**generateYAxis
         * creates y axis on the svg
         *
         * @params generateYAxis
         */

    }, {
        key: 'generateYAxis',
        value: function generateYAxis(yAxisData) {
            //declare local variables
            var chart = this,
                yAxisScale = jvCharts.getAxisScale('y', yAxisData, chart.config.container, null, chart.options),
                yAxisClass = 'yAxisLabels editable editable-yAxis editable-text',
                maxYAxisLabelWidth,
                numberOfTicks = Math.floor(chart.config.container.height / 14),
                yAxis,
                yContent,
                yAxisGroup;

            //assign css class for edit mode
            //if the axis is numbers add editable-num
            if (yAxisData.dataType === 'NUMBER') {
                yAxisClass += ' editable-num';
            }

            //Save y axis scale to chart object
            chart.currentData.yAxisScale = yAxisScale;

            //remove previous svg elements
            chart.svg.selectAll('.yAxisContainer').remove();
            chart.svg.selectAll('text.yLabel').remove();

            if (numberOfTicks > 10) {
                if (numberOfTicks < 20) {
                    numberOfTicks = 10;
                } else if (numberOfTicks < 30) {
                    numberOfTicks /= 2;
                } else {
                    numberOfTicks = 15;
                }
            }

            yAxis = d3.axisLeft().ticks(numberOfTicks) //Link to D3.svg.axis options: https://github.com/mbostock/d3/wiki/SVG-Axes
            .scale(yAxisScale) //Sets the scale to use in the axis
            .tickSize(5) //Sets the thickness of the axis line
            .tickPadding(5);

            //Hide Axis values if necessary
            if (yAxisData.hideValues) {
                yAxis.tickFormat('');
            }

            yContent = chart.svg.append('g').attr('class', 'yAxisContainer');

            yContent.append('g').attr('class', 'yLabel').append('text').attr('class', 'yLabel editable editable-text editable-content').attr('text-anchor', 'start').attr('font-size', chart.options.fontSize).attr('fill-opacity', 0).attr('x', 0).attr('y', 0).attr('transform', 'translate(' + (-chart.config.margin.left + 10) + ', -10)').text(yAxisData.label).transition().duration(0).attr('fill-opacity', 1);

            yAxisGroup = yContent.append('g').attr('class', 'yAxis');

            yAxisGroup.transition().duration(0).call(yAxis);

            //Styling for Axis
            yAxisGroup.select('path').attr('stroke', chart.vars.axisColor).attr('stroke-width', chart.vars.strokeWidth);

            maxYAxisLabelWidth = 0;

            if (yAxisData.hideValues) {
                //Styling for ticks
                yAxisGroup.selectAll('line').attr('stroke-width', 0);
            } else {
                //Styling for ticks
                yAxisGroup.selectAll('line').attr('stroke', chart.vars.axisColor).attr('stroke-width', chart.vars.stroke);
                //Styling for data labels on axis
                yAxisGroup.selectAll('text').attr('fill', 'black') //Customize the color of axis labels
                .attr('class', yAxisClass).attr('transform', 'rotate(0)') //Add logic to rotate axis based on size of title
                .attr('font-size', chart.options.fontSize).append('svg:title');

                var formatValueType = jvFormatValueType(yAxisData.values);

                yAxisGroup.selectAll('text').transition().text(function (d) {
                    if (chart.options.rotateAxis) {
                        return d;
                    }
                    var maxLength = 13;
                    var current = '';
                    if (d.length > maxLength) {
                        current = d.substring(0, maxLength) + '...';
                    } else {
                        current = d;
                    }
                    return jvFormatValue(current, formatValueType);
                }).each(function (d, i, j) {
                    if (j[0].getBBox().width > maxYAxisLabelWidth) {
                        maxYAxisLabelWidth = j[0].getBBox().width;
                    }
                });

                if (maxYAxisLabelWidth > 0) {
                    chart.options.yLabelWidth = Math.ceil(maxYAxisLabelWidth) + 20;
                }
            }
        }
        /************************************************ Legend functions ******************************************************/

    }, {
        key: 'generateLegend',
        value: function generateLegend(legendData, drawFunc) {
            var chart = this,
                svg = chart.svg;

            svg.selectAll('.legend').remove();

            //Returns the legend rectangles that are toggled on/off
            var legendElements = generateLegendElements(chart, legendData, drawFunc);
            if (drawFunc) {
                attachClickEventsToLegend(chart, legendElements, drawFunc, legendData);
            }

            if (chart.options.thresholds !== 'none' && chart.options.thesholdLegend === true) {
                if (chart.config.type === 'bar' || chart.config.type === 'area' || chart.config.type === 'line') {
                    if (chart.config.container.height > 200 && chart.config.container.width > 200) {
                        generateThresholdLegend(chart);
                    }
                }
            }

            if (!chart.options.toggleLegend) {
                svg.selectAll('.legend').remove();
                svg.selectAll('.legend-carousel').remove();
            }
        }

        /**generateVerticalLegend
         *
         * creates and draws a vertical legend on the svg element
         * @params svg, legendData, options, container, chartData, xAxisData, yAxisData, chartType
         * @returns {{}}
         */

    }, {
        key: 'generateVerticalLegend',
        value: function generateVerticalLegend(paintFunc) {
            var chart = this,
                svg = chart.svg,
                legendData = chart.currentData.legendData;

            svg.selectAll('.legend').remove();

            //Returns the legend rectangles that are toggled on/off
            var legendElements = generateVerticalLegendElements(chart, legendData, paintFunc);
            if (paintFunc !== 'generatePack') {
                attachClickEventsToLegend(chart, legendElements, paintFunc, legendData);
            }

            if (!chart.options.toggleLegend) {
                svg.selectAll('.legend').remove();
                svg.selectAll('.legend-carousel').remove();
            }
        }

        /**
         *
         * Generates a clip path that contains the contents of the chart area to the view of the chart area container
         * i.e - don't want bars going below the x axis
         */

    }, {
        key: 'generateClipPath',
        value: function generateClipPath() {
            var chart = this,
                svg = chart.svg,
                type = chart.config.type;

            svg.append('clipPath').attr('id', 'clip').append('rect').attr('x', 0).attr('y', 0).attr('width', chart.config.container.width).attr('height', chart.config.container.height);

            //Break this out into logic for all other vizzes that have overflow issues
            var containerName = '.' + type + '-container';
            svg.select(containerName).attr('clip-path', 'url(#clip)');
        }
    }, {
        key: 'setThreshold',
        value: function setThreshold(data) {
            var chart = this,
                thresholds = chart.options.thresholds,
                length = thresholds ? Object.keys(thresholds).length : 0;

            if (thresholds !== 'none') {
                for (var i = length - 1; i > -1; i--) {
                    var threshold = thresholds[i];
                    //console.log(typeof data == "date");
                    if (data >= Number(threshold.threshold)) {
                        return 'rect-' + i;
                    }
                }
            }
        }
    }, {
        key: 'generateLineThreshold',
        value: function generateLineThreshold() {
            var chart = this,
                svg = chart.svg,
                width = chart.config.container.width,
                height = chart.config.container.height,
                thresholds = chart.options.thresholds,
                length = Object.keys(chart.options.thresholds).length;

            var x = chart.currentData.xAxisScale;
            var y = chart.currentData.yAxisScale;

            if (thresholds !== 'none') {
                for (var i = 0; i < length; i++) {
                    var threshold = thresholds[i];
                    if (chart.options.rotateAxis) {
                        svg.append('line').style('stroke', threshold.thresholdColor).attr('x1', x(threshold.threshold)).attr('y1', 0).attr('x2', x(threshold.threshold)).attr('y2', height).attr('stroke-dasharray', '3, 3');
                    } else {
                        svg.append('line').style('stroke', threshold.thresholdColor).attr('x1', 0).attr('y1', y(threshold.threshold)).attr('x2', width).attr('y2', y(threshold.threshold)).attr('stroke-dasharray', '3, 3');
                    }
                }
            }
        }
    }, {
        key: 'colorBackground',
        value: function colorBackground(color) {
            var chart = this;
            var chartDiv = chart.chartDiv;
            chart.options.backgroundColor = color;
            chartDiv.style('background-color', '' + color);
        }

        /**displayValues
         *
         * toggles data values that are displayed on the specific type of chart on the svg
         * @params svg, barData, options, xAxisData, yAxisData, container
         * @returns {{}}
         */

    }, {
        key: 'displayValues',
        value: function displayValues() {
            //TODO receive data similar to generateBar
            var chart = this,
                svg = chart.svg,
                options = chart.options,
                container = chart.config.container,
                barData = chart.data.chartData,
                xAxisData = chart.currentData.xAxisData,
                yAxisData = chart.currentData.yAxisData,
                legendOptions = chart.options.legendOptions;

            //If series is flipped, use flipped data; initialize with the full data set
            if (options.seriesFlipped) {
                barData = chart.flippedData.chartData;
                legendOptions = chart.options.flippedLegendOptions;
            }

            if (options.displayValues === true) {
                svg.selectAll('.displayValueContainer').remove();

                var data = []; //Only stores values for bars
                var barDataNew = JSON.parse(JSON.stringify(barData)); //Copy of barData

                if (legendOptions) {
                    //Checking which legend elements are toggled on resize
                    for (var j = 0; j < barDataNew.length; j++) {
                        for (var i = 0; i < legendOptions.length; i++) {
                            if (legendOptions[i].toggle === false) {
                                delete barDataNew[j][legendOptions[i].element];
                            }
                        }
                    }
                }

                for (var i = 0; i < barDataNew.length; i++) {
                    //barDataNew used
                    var val = values(barDataNew[i], chart.currentData.dataTable, chart.config.type);
                    data.push(val.slice(0, barDataNew[i].length));
                }

                var posCalc = getPosCalculations(barDataNew, options, xAxisData, yAxisData, container, chart);

                var x = jvCharts.getAxisScale('x', xAxisData, container, options);
                var y = jvCharts.getAxisScale('y', yAxisData, container, options);

                //var format = getFormatExpression("displayValues");

                if (options.rotateAxis) {
                    //Add a container for display values over each bar group
                    var displayValuesGroup = svg.append('g').attr('class', 'displayValuesGroup').selectAll('g').data(data).enter().append('g').attr('class', 'displayValuesGroup').attr('transform', function (d, i) {
                        var translate = y.paddingOuter() * y.step() + y.step() * i;
                        return 'translate(0,' + translate + ')';
                    });

                    displayValuesGroup.selectAll('text').data(function (d) {
                        return d;
                    }).enter().append('text').attr('class', 'displayValue').attr('x', function (d, i, j) {
                        //sets the x position of the bar)
                        return posCalc.width(d, i, j) + posCalc.x(d, i, j);
                    }).attr('y', function (d, i, j) {
                        //sets the y position of the bar
                        return posCalc.y(d, i, j) + posCalc.height(d, i, j) / 2;
                    }).attr('dy', '.35em').attr('text-anchor', 'start').attr('fill', 'black').text(function (d) {
                        var returnText = Math.round(d * 100) / 100; //round to 2 decimals
                        return jvFormatValue(returnText);
                    }).attr('font-size', chart.options.fontSize);
                } else {
                    //Add a display values container over each bar group
                    svg.append('g').attr('class', 'displayValuesGroup').selectAll('g').data(data).enter().append('g').attr('class', 'displayValuesGroup').attr('transform', function (d, i) {
                        var translate = x.paddingOuter() * x.step() + x.step() * i;
                        return 'translate(' + translate + ',0)';
                    });

                    displayValuesGroup.selectAll('text').data(function (d) {
                        return d;
                    }).enter().append('text').attr('class', 'displayValue').attr('x', function (d, i, j) {
                        //sets the x position of the bar)
                        return Math.round(posCalc.x(d, i, j) + posCalc.width(d, i, j) / 2);
                    }).attr('y', function (d, i, j) {
                        //sets the y position of the bar
                        return Math.round(posCalc.y(d, i, j)); //+ posCalc.height(d, i, j) - 5);
                    }).attr('text-anchor', 'middle').attr('fill', 'black').text(function (d, i, j) {
                        var returnText = Math.round(d * 100) / 100; //Round to 2 decimals
                        //return format(returnText);//expression(d);
                        return jvFormatValue(returnText);
                    }).attr('font-size', chart.options.fontSize);
                }
            } else {
                svg.selectAll('.displayValueContainer').remove();
            }
        }
    }, {
        key: 'drawGridlines',
        value: function drawGridlines(axisData) {
            var chart = this;

            chart.svg.selectAll('g.gridLines').remove();
            chart.svg.append('g').attr('class', 'gridLines');
            var scaleData;

            //Determine if gridlines are horizontal or vertical based on rotateAxis
            if (chart.options.rotateAxis === true || chart.config.type === 'gantt' || chart.config.type === 'singleaxis') {
                var gridLineHeight = chart.config.container.height;
                var xAxisScale = jvCharts.getAxisScale('x', axisData, chart.config.container);

                if (axisData.dataType === 'STRING') {
                    scaleData = axisData.values;
                } else if (axisData.dataType === 'NUMBER' || axisData.dataType === 'DATE') {
                    scaleData = xAxisScale.ticks(10);
                }
                chart.svg.select('.gridLines').selectAll('.horizontalGrid').data(scaleData).enter().append('line').attr('class', 'horizontalGrid').attr('x1', function (d, i) {
                    if (i > 0) {
                        return xAxisScale(d);
                    }
                    return 0;
                }).attr('x2', function (d, i) {
                    if (i > 0) {
                        return xAxisScale(d);
                    }
                    return 0;
                }).attr('y1', function (d, i) {
                    return 0;
                }).attr('y2', function (d, i) {
                    if (i > 0) {
                        return gridLineHeight;
                    }
                    return 0;
                }).attr('fill', 'none').attr('shape-rendering', 'crispEdges').attr('stroke', function () {
                    if (chart.config.type === 'singleaxis') {
                        return 'black';
                    }
                    return '#e6e6e6';
                }).attr('stroke-width', '1px');
            } else {
                var gridLineWidth = chart.config.container.width;
                var yAxisScale = jvCharts.getAxisScale('y', axisData, chart.config.container);

                if (axisData.dataType === 'STRING') {
                    scaleData = axisData.values;
                } else if (axisData.dataType === 'NUMBER' || axisData.dataType === 'DATE') {
                    scaleData = yAxisScale.ticks(10);
                }
                chart.svg.select('.gridLines').selectAll('.horizontalGrid').data(scaleData).enter().append('line').attr('class', 'horizontalGrid').attr('x1', 0).attr('x2', function (d, i) {
                    if (i > 0) {
                        return gridLineWidth;
                    }
                    return 0;
                }).attr('y1', function (d, i) {
                    if (i > 0) {
                        return yAxisScale(d);
                    }
                    return 0;
                }).attr('y2', function (d, i) {
                    if (i > 0) {
                        return yAxisScale(d);
                    }
                    return 0;
                }).attr('fill', 'none').attr('shape-rendering', 'crispEdges').attr('stroke', '#e6e6e6').attr('stroke-width', '1px');
            }
        }

        /**getBarDataFromOptions
        * ^^ not just a bar function, line and area also use it
        *
        * Assigns the correct chart data to current data using the chart.options
        */

    }, {
        key: 'getBarDataFromOptions',
        value: function getBarDataFromOptions() {
            var chart = this;
            //creating these two data variables to avoid having to reference the chart obejct everytime
            var flipped = chart.flippedData;
            var data = chart.data;

            var dataObj = {};
            if (chart.options.seriesFlipped) {
                dataObj.chartData = flipped.chartData;
                dataObj.legendData = flipped.legendData;
                dataObj.dataTable = flipped.dataTable;
                chart.options.color = flipped.color;
                if (chart.options.rotateAxis === true) {
                    dataObj.xAxisData = flipped.yAxisData;
                    dataObj.yAxisData = flipped.xAxisData;
                } else {
                    dataObj.xAxisData = flipped.xAxisData;
                    dataObj.yAxisData = flipped.yAxisData;
                }
            } else {
                dataObj.chartData = data.chartData;
                dataObj.legendData = data.legendData;
                dataObj.dataTable = data.dataTable;
                chart.options.color = data.color;
                if (chart.options.rotateAxis === true) {
                    dataObj.xAxisData = data.yAxisData;
                    dataObj.yAxisData = data.xAxisData;
                } else {
                    dataObj.xAxisData = data.xAxisData;
                    dataObj.yAxisData = data.yAxisData;
                }
            }

            return dataObj;
        }

        /************************************************ Utility functions ******************************************************/

        /**highlightItems
         *
         * highlights items on the svg element
         * @params items, svg
         * @returns {{}}
         */

    }, {
        key: 'highlightItem',
        value: function highlightItem(items, tag, highlightIndex, highlightUri) {
            var chart = this,
                svg = chart.svg;

            //TODO remove if statements
            if (highlightIndex >= 0) {
                if (chart.config.type === 'pie') {
                    //set all circles stroke width to 0
                    svg.select('.pie-container').selectAll(tag).attr('stroke', '#FFFFFF').attr('stroke-width', 1);
                    //highlight necessary pie slices
                    svg.select('.pie-container').selectAll(tag).filter('.highlight-class-' + highlightIndex).attr('stroke', 'black').attr('stroke-width', 2.0);
                }
                if (chart.config.type === 'scatterplot') {
                    //set all circles stroke width to 0
                    svg.select('.scatter-container').selectAll(tag).attr('stroke-width', 0);
                    //highlight necessary scatter dots
                    svg.select('.scatter-container').selectAll(tag).filter('.scatter-circle-' + highlightIndex).attr('stroke', 'black').attr('stroke-width', 2.0);
                }
            } else if (highlightUri) {
                if (chart.config.type === 'bar') {
                    //set all bars stroke width to 0
                    svg.select('.bar-container').selectAll(tag).attr('stroke', 0).attr('stroke-width', 0);
                    //highlight necessary bars
                    svg.select('.bar-container').selectAll('.highlight-class-' + highlightUri).attr('stroke', 'black').attr('stroke-width', 2.0);
                }
                if (chart.config.type === 'line' || chart.config.type === 'area') {
                    //set all circles stroke width to 0
                    svg.select('.line-container').selectAll(tag).attr('stroke', 0).attr('stroke-width', 0);
                    //highlight necessary cirlces
                    svg.select('.line-container').selectAll(tag).filter('.highlight-class-' + highlightUri).attr('stroke', 'black').attr('stroke-width', 2.0);
                }
            } else {
                console.log('need to pass highlight index to highlight item');
            }
        }

        /**
        *@desc Removes highlights that were applied with related insights
        *
        */

    }, {
        key: 'removeHighlight',
        value: function removeHighlight() {
            var chart = this;
            var svg = chart.svg;
            if (chart.config.type === 'pie') {
                //set all circles stroke width to 0
                svg.select('.pie-container').selectAll('path').attr('stroke', '#FFFFFF').attr('stroke-width', 0);
            }
            if (chart.config.type === 'scatterplot') {
                svg.select('.scatter-container').selectAll('circle').attr('stroke-width', 0);
            }
            if (chart.config.type === 'bar') {
                svg.select('.bar-container').selectAll('rect').attr('stroke', 0).attr('stroke-width', 0);
            }
            if (chart.config.type === 'line' || chart.config.type === 'area') {
                svg.select('.line-container').selectAll('circle').attr('stroke', 0).attr('stroke-width', 0);
            }
        }
    }]);

    return jvCharts;
}();

function jvFormatValue(val, formatType) {
    if (!isNaN(val)) {
        var formatNumber = d3.format('.0f');

        if (formatType === 'billions') {
            return formatNumber(val / 1e9) + 'B';
        } else if (formatType === 'millions') {
            return formatNumber(val / 1e6) + 'M';
        } else if (formatType === 'thousands') {
            return formatNumber(val / 1e3) + 'K';
        } else if (formatType === 'decimals') {
            formatNumber = d3.format('.2f');
            return formatNumber(val);
        } else if (formatType === 'nodecimals') {
            return formatNumber(val);
        }

        if (val === 0) {
            return 0;
        }

        if (Math.abs(val) >= 1000000000) {
            //Billions
            return formatNumber(val / 1e9) + 'B';
        } else if (Math.abs(val) >= 1000000) {
            //Millions
            return formatNumber(val / 1e6) + 'M';
        } else if (Math.abs(val) >= 1000) {
            //Thousands
            return formatNumber(val / 1e3) + 'K';
        } else if (Math.abs(val) <= 10) {
            //2 decimals
            formatNumber = d3.format('.2f');
        }
        return formatNumber(val);
    }
    return val;
}

/**
 * @param the set of values that you want to format uniformly
 * @return '' the level of formatting for the group of data
 * Problem with jvFormatValue function is that if you pass in values 10, 20... 90, 100, 1120, 120
 * you will get the formats 10.00, 20.00 .... 100, 110, 120 when you want 10, 20, ... 100, 110
 * --Format the value based off of the highest number in the group
 */
function jvFormatValueType(values) {
    if (values != null) {
        var max = Math.max.apply(null, values);
        //After getting the max, check the min
        var min = Math.min.apply(null, values);
        var range = max - min;
        var incrememnt = Math.abs(Math.round(range / 10)); //10 being the number of axis labels to show

        if (Math.abs(incrememnt) >= 1000000000) {
            return 'billions';
        } else if (Math.abs(incrememnt) >= 1000000) {
            return 'millions';
        } else if (Math.abs(incrememnt) >= 1000) {
            return 'thousands';
        } else if (Math.abs(incrememnt) <= 10) {
            return 'decimals';
        } else if (Math.abs(incrememnt) >= 10) {
            return 'nodecimals';
        }
    }
    return '';
}

/**getFormatExpression
 *
 * @desc returns the d3 format expression for a given option
 * @params option
 * @returns string expression
 */
function getFormatExpression(option) {
    var expression = '',
        p;
    if (option === 'currency') {
        expression = d3.format('$,');
    }
    if (option === 'fixedCurrency') {
        expression = d3.format('($.2f');
    }
    if (option === 'percent') {
        p = Math.max(0, d3.precisionFixed(0.05) - 2);
        expression = d3.format('.' + p + '%');
    }
    if (option === 'millions') {
        p = d3.precisionPrefix(1e5, 1.3e6);
        expression = d3.formatPrefix('.' + p, 1.3e6);
    }
    if (option === 'commas') {
        expression = d3.format(',.0f');
    }
    if (option === 'none' || option === '') {
        expression = d3.format('');
    }
    if (option === 'displayValues') {
        expression = d3.format(',.2f');
    }

    return expression;
}

/**getToggledData
 *
 * Gets the headers of the data to be drawn and filters the data based on that
 * @params chartData, dataHeaders
 */
function getToggledData(chartData, dataHeaders) {
    var legendElementToggleArray = getLegendElementToggleArray(dataHeaders, chartData.legendData);
    var data = JSON.parse(JSON.stringify(chartData.chartData));
    if (legendElementToggleArray) {
        for (var j = 0; j < data.length; j++) {
            for (var i = 0; i < legendElementToggleArray.length; i++) {
                if (legendElementToggleArray[i].toggle === false) {
                    delete data[j][legendElementToggleArray[i].element];
                }
            }
        }
    }
    return data;
}

/**getLegendElementToggleArray
 *
 * Gets an array of legend elements with true/false tags for if toggled
 * @params selectedHeaders, allHeaders
 */
function getLegendElementToggleArray(selectedHeaders, allHeaders) {
    var legendElementToggleArray = [];
    for (var i = 0; i < allHeaders.length; i++) {
        legendElementToggleArray.push({ element: allHeaders[i] });
    }

    for (var i = 0; i < legendElementToggleArray.length; i++) {
        for (var j = 0; j < selectedHeaders.length; j++) {
            if (legendElementToggleArray[i].element === selectedHeaders[j]) {
                legendElementToggleArray[i].toggle = true;
                continue;
            }
        }
        if (legendElementToggleArray[i].toggle !== true) {
            legendElementToggleArray[i].toggle = false;
        }
    }
    return legendElementToggleArray;
}

/**generateLegendElements
 *
 * Creates the legend elements--rectangles and labels
 * @params chart, legendData, drawFunc
 */
function generateLegendElements(chart, legendData, drawFunc) {
    var svg = chart.svg,
        container = chart.config.container,
        options = chart.options,
        legend,
        legendRow = 0,
        legendColumn = 0,
        legendDataLength = legendData.length;

    options.legendMax = 9;
    options.gridSize = 12;

    if (!options.legendIndex) {
        options.legendIndex = 0;
    }

    if (!options.legendIndexMax) {
        options.legendIndexMax = Math.floor(legendDataLength / options.legendMax - 0.01);
    }

    //if legend headers don't exist, set them equal to legend data
    if (!options.legendHeaders && !options.seriesFlipped) {
        options.legendHeaders = JSON.parse(JSON.stringify(legendData));
    } else if (!options.flippedLegendHeaders && options.seriesFlipped) {
        options.flippedLegendHeaders = JSON.parse(JSON.stringify(legendData));
    }
    //Set legend element toggle array based on if series is flipped
    if (!options.seriesFlipped) {
        var legendElementToggleArray = getLegendElementToggleArray(options.legendHeaders, legendData);
    } else {
        var flippedLegendElementToggleArray = getLegendElementToggleArray(options.flippedLegendHeaders, legendData);
    }

    legend = svg.append('g').attr('class', 'legend');

    //Adding colored rectangles to the legend
    var legendRectangles = legend.selectAll('rect').data(legendData).enter().append('rect').attr('class', 'legendRect').attr('x', function (d, i) {
        if (i % (options.legendMax / 3) === 0 && i > 0) {
            legendColumn = 0;
        }
        var legendPos = 200 * legendColumn;
        legendColumn++;
        return legendPos;
    }).attr('y', function (d, i) {
        if (i % (options.legendMax / 3) === 0 && i > 0) {
            legendRow++;
        }
        if (i % options.legendMax === 0 && i > 0) {
            legendRow = 0;
        }
        return container.height + 10 + 15 * (legendRow + 1) - 5; //Increment row when column limit is reached
    }).attr('width', options.gridSize).attr('height', options.gridSize).attr('fill', function (d, i) {
        return getColors(options.color, i, legendData[i]);
    }).attr('display', function (d, i) {
        if (i >= options.legendIndex * options.legendMax && i <= options.legendIndex * options.legendMax + (options.legendMax - 1)) {
            return 'all';
        }
        return 'none';
    }).attr('opacity', function (d, i) {
        if (!legendElementToggleArray && !chart.options.seriesFlipped || chart.options.seriesFlipped && !flippedLegendElementToggleArray) {
            return '1';
        }
        if (!chart.options.seriesFlipped && legendElementToggleArray[i].toggle === true || chart.options.seriesFlipped && flippedLegendElementToggleArray[i].toggle === true) {
            return '1';
        }
        return '0.2';
    });

    legendRow = 0;
    legendColumn = 0;

    //Adding text labels for each rectangle in legend
    var legendText = legend.selectAll('text').data(legendData).enter().append('text').attr('class', function (d, i) {
        return 'legendText editable editable-text editable-content editable-legend-' + i;
    }).attr('x', function (d, i) {
        if (i % (options.legendMax / 3) === 0 && i > 0) {
            legendColumn = 0;
        }
        var legendPos = 200 * legendColumn;
        legendColumn++;
        return legendPos + 17;
    }).attr('y', function (d, i) {
        if (i % (options.legendMax / 3) === 0 && i > 0) {
            legendRow++;
        }
        if (i % options.legendMax === 0 && i > 0) {
            legendRow = 0;
        }
        return container.height + 10 + 15 * (legendRow + 1); //Increment row when column limit is reached
    }).attr('text-anchor', 'start').attr('dy', '0.35em') //Vertically align with node
    .attr('fill', 'black').attr('font-size', chart.options.fontSize).attr('display', function (d, i) {
        if (i >= options.legendIndex * options.legendMax && i <= options.legendIndex * options.legendMax + (options.legendMax - 1)) {
            return 'all';
        }
        return 'none';
    }).text(function (d, i) {
        var elementName = legendData[i];
        if (chart.config.type === 'gantt') {
            elementName = legendData[i].slice(0, -5); //Removing last 5 characters of legend label---i.e plannedSTART -> planned
        }
        if (elementName.length > 20) {
            return elementName.substring(0, 19) + '...';
        }
        return elementName;
    });

    //Adding info box to legend elements when hovering over
    legendText.data(legendData).append('svg:title').text(function (d) {
        return d;
    });

    //Only create carousel if the number of elements exceeds one legend "page"
    if (options.legendIndexMax > 0) {
        createCarousel(chart, legendData, drawFunc);
    }
    //Centers the legend in the panel
    if (legend) {
        var legendWidth = legend.node().getBBox().width;
        legend.attr('transform', 'translate(' + (container.width - legendWidth) / 2 + ', 30)');
    }

    return legendRectangles;
}

/**updateDataFromLegend
 *
 * Returns a list of data headers that should be displayed in viz
 * based off what is toggled on/off in legend
 * @params legendData
 */
function updateDataFromLegend(legendData) {
    var data = [];
    var legendElement = legendData[0];
    for (var i = 0; i < legendElement.length; i++) {
        if (legendElement[i].attributes.opacity.value !== '0.2') {
            //If not white, add it to the updated data array
            data.push(legendElement[i].__data__);
        }
    }
    return data;
}

/**createCarousel
 *
 * Draws the horizontal legend carousel
 * @params chart, legendData, drawFunc
 */
function createCarousel(chart, legendData, drawFunc) {
    var svg = chart.svg,
        container = chart.config.container,
        options = chart.options,
        legendPolygon;

    //Adding carousel to legend
    svg.selectAll('.legend-carousel').remove();
    svg.selectAll('#legend-text-index').remove();

    legendPolygon = svg.append('g').attr('class', 'legend-carousel');

    //Creates left navigation arrow for carousel
    legendPolygon.append('polygon').attr('id', 'leftChevron').attr('class', 'pointer-cursor').style('fill', '#c2c2d6').attr('transform', 'translate(0,0)').attr('points', '0,7.5, 15,0, 15,15').on('click', function () {
        if (options.legendIndex >= 1) {
            options.legendIndex--;
        }
        svg.selectAll('.legend').remove();
        var legendElements = generateLegendElements(chart, legendData, drawFunc);
        attachClickEventsToLegend(chart, legendElements, drawFunc, legendData);
        chart.localCallbackApplyEdits();
    }).attr({
        display: function display() {
            if (options.legendIndex === 0) {
                return 'none';
            }
            return 'all';
        }
    });

    //Creates page number for carousel navigation
    legendPolygon.append('text').attr('id', 'legend-text-index').attr('x', 35).attr('y', 12.5).style('text-anchor', 'start').style('font-size', chart.options.fontSize).text(function () {
        return options.legendIndex + ' / ' + options.legendIndexMax;
    }).attr({
        display: function display() {
            if (options.legendIndexMax === 0) {
                return 'none';
            }
            return 'all';
        }
    });

    //Creates right navigation arrow for carousel
    legendPolygon.append('polygon').attr('id', 'rightChevron').attr('class', 'pointer-cursor').style('fill', '#c2c2d6').attr('transform', 'translate(85,0)').attr('points', '15,7.5, 0,0, 0,15').on('click', function () {
        if (options.legendIndex < options.legendIndexMax) {
            options.legendIndex++;
        }
        svg.selectAll('.legend').remove();
        var legendElements = generateLegendElements(chart, legendData, drawFunc);
        attachClickEventsToLegend(chart, legendElements, drawFunc, legendData);
        chart.localCallbackApplyEdits();
    }).attr({
        display: function display() {
            if (options.legendIndex === options.legendIndexMax) {
                return 'none';
            }
            return 'all';
        }
    });

    //Centers the legend polygons in the panel
    if (legendPolygon) {
        var legendPolygonWidth = legendPolygon.node().getBBox().width;
        legendPolygon.attr('transform', 'translate(' + (container.width - legendPolygonWidth) / 2 + ',' + (container.height + 105) + ')');
    }
}

/**getPlotData
 *
 * Returns only data values to be plotted; input is the data object
 * @params objectData, chart
 */
function getPlotData(objectData, chart) {
    var data = [];
    var objDataNew = JSON.parse(JSON.stringify(objectData)); //Copy of barData
    for (var i = 0; i < objDataNew.length; i++) {
        var group = [];
        for (var j = 0; j < chart.currentData.legendData.length; j++) {
            if (typeof objDataNew[i][chart.currentData.legendData[j]] !== 'undefined') {
                group.push(objDataNew[i][chart.currentData.legendData[j]]);
            }
        }
        data.push(group);
    }
    return data;
}

/**getPosCalculations
 *Holds the logic for positioning all bars on a bar chart (depends on toolData)
 *
 * @params svg, barData, options, xAxisData, yAxisData, container
 * @returns {{}}
 */
function getPosCalculations(barData, options, xAxisData, yAxisData, container, chart) {
    var x = jvCharts.getAxisScale('x', xAxisData, container, options),
        y = jvCharts.getAxisScale('y', yAxisData, container, options),
        scaleFactor = 1,
        data = [],
        size = Object.keys(chart.currentData.dataTable).length - 1,
        positionFunctions = {};

    for (var i = 0; i < barData.length; i++) {
        var val = [];
        for (var key in barData[i]) {
            if (barData[i].hasOwnProperty(key)) {
                val.push(barData[i][key]);
            }
        }
        data.push(val.slice(1, barData[i].length));
    }

    if (options.rotateAxis === true && options.stackToggle === true) {
        positionFunctions.startx = function () {
            return 0;
        };
        positionFunctions.starty = function () {
            return 0;
        };
        positionFunctions.startwidth = function () {
            return 0;
        };
        positionFunctions.startheight = function () {
            return y.bandwidth() * 0.95;
        };
        positionFunctions.x = function (d, i, j) {
            var increment = 0; //Move the x up by the values that come before it
            for (var k = i - 1; k >= 0; k--) {
                if (!isNaN(j[k].__data__)) {
                    increment += j[k].__data__;
                }
            }
            return x(increment) === 0 ? 1 : x(increment);
        };
        positionFunctions.y = function () {
            return 0;
        };
        positionFunctions.width = function (d) {
            return Math.abs(x(0) - x(d));
        };
        positionFunctions.height = function () {
            return y.bandwidth() * 0.95;
        };
    } else if (options.rotateAxis === true && options.stackToggle === false) {
        positionFunctions.startx = function () {
            return 0;
        };
        positionFunctions.starty = function (d, i) {
            return y.bandwidth() / size * i;
        };
        positionFunctions.startwidth = function () {
            return 0;
        };
        positionFunctions.startheight = function (d) {
            return y.bandwidth() / size * 0.95 * scaleFactor;
        };
        positionFunctions.x = function (d) {
            return x(0) - x(d) > 0 ? x(d) : x(0);
        };
        positionFunctions.y = function (d, i) {
            return y.bandwidth() / size * i;
        };
        positionFunctions.width = function (d) {
            return Math.abs(x(0) - x(d));
        };
        positionFunctions.height = function () {
            return y.bandwidth() / size * 0.95 * scaleFactor;
        };
    } else if (options.rotateAxis === false && options.stackToggle === true) {
        positionFunctions.startx = function () {
            return 0;
        };
        positionFunctions.starty = function () {
            return container.height;
        };
        positionFunctions.startwidth = function () {
            return x.bandwidth() * 0.95 * scaleFactor;
        };
        positionFunctions.startheight = function () {
            return 0;
        };
        positionFunctions.x = function () {
            return 0;
        };
        positionFunctions.y = function (d, i, j) {
            var increment = 0; //Move the y up by the values that come before it
            for (var k = i - 1; k >= 0; k--) {
                if (!isNaN(j[k].__data__)) {
                    increment += j[k].__data__;
                }
            }
            return y(parseFloat(d) + increment);
        };
        positionFunctions.width = function () {
            return x.bandwidth() * 0.95 * scaleFactor;
        };
        positionFunctions.height = function (d) {
            return container.height - y(d);
        };
    } else if (options.rotateAxis === false && options.stackToggle === false) {
        positionFunctions.startx = function (d, i) {
            return x.bandwidth() / size * i;
        };
        positionFunctions.starty = function () {
            return container.height;
        };
        positionFunctions.startwidth = function () {
            return x.bandwidth() / size * 0.95;
        };
        positionFunctions.startheight = function () {
            return 0;
        };
        positionFunctions.x = function (d, i) {
            return x.bandwidth() / size * i;
        };
        positionFunctions.y = function (d) {
            return y(0) - y(d) > 0 ? y(d) : y(0);
        };
        positionFunctions.width = function () {
            return x.bandwidth() / size * 0.95;
        };
        positionFunctions.height = function (d) {
            return Math.abs(y(0) - y(d));
        };
    }
    return positionFunctions;
}

/**getColors
 *
 * gets the colors to apply to the specific chart
 * @params colorObj, index, label
 * @returns {{}}
 */
function getColors(colorObj, paramIndex, label) {
    var index = paramIndex;

    //logic to return the color if the colorObj passed in
    //is an object with the label being the key
    if (typeof label !== 'undefined' && colorObj.hasOwnProperty(label) && colorObj[label]) {
        return colorObj[label];
    }

    var cleanedColors = [];

    if (!Array.isArray(colorObj)) {
        cleanedColors = [];
        for (var k in colorObj) {
            if (colorObj.hasOwnProperty(k)) {
                if (colorObj[k]) {
                    cleanedColors.push(colorObj[k]);
                }
            }
        }
    } else {
        cleanedColors = colorObj;
    }

    //logic to return a repeating set of colors assuming that
    //the user changed data (ex: flip series on bar chart)
    if (!cleanedColors[index]) {
        while (index > cleanedColors.length - 1) {
            index = index - cleanedColors.length;
        }
    }
    return cleanedColors[index];
}

function getAxisScale(whichAxis, axisData, container, padding, options) {
    var leftPadding = 0.4,
        rightPadding = 0.2;
    if (padding === 'no-padding') {
        leftPadding = 0;
        rightPadding = 0;
    }
    var axisScale, axis;

    whichAxis === 'x' ? axis = container.width : axis = container.height;

    if (axisData.dataType === 'DATE') {
        for (var i = 0; i < axisData.values.length; i++) {
            axisData.values[i] = new Date(axisData.values[i]);
        }

        var maxDate = Math.max.apply(null, axisData.values);
        var minDate = Math.min.apply(null, axisData.values);

        axisScale = d3.scaleTime().domain([new Date(minDate), new Date(maxDate)]).rangeRound([0, axis]);
    } else if (axisData.dataType === 'STRING') {
        axisScale = d3.scaleBand().domain(axisData.values).range([0, axis]).paddingInner(leftPadding).paddingOuter(rightPadding);
    } else if (axisData.dataType === 'NUMBER') {
        //axisScale = d3.scaleBand().domain([min, max]).rangeRound([0, axis]);
        var domain;
        if (options != null && (typeof options === 'undefined' ? 'undefined' : _typeof(options)) === 'object' && options.hasOwnProperty('xReversed') && options.hasOwnProperty('yReversed')) {
            if (options.xReversed && whichAxis === 'x' || whichAxis === 'y' && !options.yReversed) {
                domain = [axisData.max, axisData.min];
            }
            if (options.yReversed && whichAxis === 'y' || whichAxis === 'x' && !options.xReversed) {
                domain = [axisData.min, axisData.max];
            }
        } else {
            whichAxis === 'x' ? domain = [axisData.min, axisData.max] : domain = [axisData.max, axisData.min];
        }

        if (!!options && options.hasOwnProperty('axisType') && options.axisType === 'Logarithmic') {
            domain[1] = 0.1;
            axisScale = d3.scaleLog().base(10).domain(domain).rangeRound([0, axis]);
        } else {
            axisScale = d3.scaleLinear().domain(domain).rangeRound([0, axis]);
        }
    } else {
        console.error('Axis is not a valid data type');
    }
    return axisScale;
}

/**getXScale
 *
 * get the scale for the x axis
 * @params xAxisData, container, padding
 * @returns {{}}
 */
function getXScale(xAxisData, container, padding) {
    var xAxisScale;
    var leftPadding = 0.4,
        rightPadding = 0.2;
    if (padding === 'no-padding') {
        leftPadding = 0;
        rightPadding = 0;
    }

    //check if values length is greater than two incase the labels are all numbers. if it is a linear scale then there will only be a min and max
    if (xAxisData.dataType === 'DATE') {
        for (var i = 0; i < xAxisData.values.length; i++) {
            xAxisData.values[i] = new Date(xAxisData.values[i]);
        }

        var maxDate = Math.max.apply(null, xAxisData.values);
        var minDate = Math.min.apply(null, xAxisData.values);

        xAxisScale = d3.time.scale().domain([new Date(minDate), new Date(maxDate)]).rangeRound([0, container.width]);
    } else if (xAxisData.dataType === 'STRING' || xAxisData.values.length > 2) {
        xAxisScale = d3.scaleBand().domain(xAxisData.values).range([0, container.width]).paddingInner(leftPadding).paddingOuter(rightPadding);
    } else if (xAxisData.dataType === 'NUMBER') {
        var max = xAxisData.values[xAxisData.values.length - 1];
        var min = xAxisData.values[0];

        xAxisScale = d3.scaleBand().domain([min, max]).rangeRound([0, container.width]);
    }
    return xAxisScale;
}

/**getYScale
 *
 * gets the scale for the y axis
 * @params yAxisData, container, padding
 * @returns {{}}
 */
function getYScale(yAxisData, container) {
    var yAxisScale;

    if (yAxisData.dataType === 'STRING') {
        yAxisScale = d3.scaleOrdinal().domain(yAxisData.values).range([0, container.height]);
    } else if (yAxisData.dataType === 'NUMBER') {
        var max = yAxisData.values[yAxisData.values.length - 1];
        var min = yAxisData.values[0];
        yAxisScale = d3.scaleLinear().domain([max, min]).rangeRound([0, container.height]);
    }
    return yAxisScale;
}

/************************************************ Data functions ******************************************************/

/**
 * @function
 * @param {string} label - The field that is checked for type
 * @param {Object} dataTableKeys - Object that contains the data type for each column of data
 */
function getDataTypeFromKeys(label, dataTableKeys) {
    var type;

    for (var i = 0; i < dataTableKeys.length; i++) {
        //Replace underscores with spaces
        if (dataTableKeys[i].varKey.replace(/_/g, ' ') === label.replace(/_/g, ' ')) {
            if (dataTableKeys[i].hasOwnProperty('type')) {
                type = dataTableKeys[i].type;
                if (type === 'STRING') {
                    type = 'STRING';
                } else if (type === 'DATE') {
                    type = 'DATE';
                } else if (type === 'NUMBER') {
                    type = 'NUMBER';
                } else {
                    type = 'NUMBER';
                }
                break;
            }
        }
    }
    return type;
}

/**setBarLineLegendData
 *  gets legend info from chart Data
 *
 * @params data, type
 * @returns [] of legend text
 */
function setBarLineLegendData(data) {
    var legendArray = [];
    for (var item in data.dataTable) {
        if (data.dataTable.hasOwnProperty(item)) {
            if (item !== 'label') {
                legendArray.push(data.dataTable[item]);
            }
        }
    }
    return legendArray;
}

/**setChartColors
 *  cleans incoming colors for consistency
 *
 * @params colorArray, legendData
 * @returns object with colors
 */

function setChartColors(toolData, legendData, defaultColorArray) {
    //function handles 3 color inputs
    //toolData as an array in toolData
    //toolData as an object
    //toolData as 'none'
    //any other case will result in using defaultColorArray

    var colors = {},
        usedColors = [],
        unaccountedLegendElements = [];

    //toolData is array
    if (Array.isArray(toolData)) {
        if (toolData.length > 0) {
            colors = createColorsWithDefault(legendData, toolData);
        } else {
            colors = createColorsWithDefault(legendData, defaultColorArray);
        }
    } else if (toolData === Object(toolData)) {
        for (var i = 0; i < legendData.length; i++) {
            var obj = legendData[i];
            if (toolData.hasOwnProperty(obj)) {
                usedColors.push(toolData[obj]);
            } else {
                unaccountedLegendElements.push(legendData[i]);
            }
        }
        //check if object has desired keys
        if (usedColors.length === legendData.length) {
            colors = toolData;
        } else if (usedColors.length > 0) {
            var toolDataAsArray = Object.values(toolData);
            if (toolDataAsArray.length > legendData.length) {
                colors = createColorsWithDefault(legendData, toolDataAsArray);
            } else {
                colors = createColorsWithDefault(legendData, defaultColorArray);
            }
        } else {
            var toolDataAsArray = Object.values(toolData);
            if (toolDataAsArray.length > legendData.length) {
                colors = createColorsWithDefault(legendData, toolDataAsArray);
            } else {
                colors = createColorsWithDefault(legendData, defaultColorArray);
            }
        }
    } else {
        colors = createColorsWithDefault(legendData, defaultColorArray);
    }

    return colors;
}

function createColorsWithDefault(legendData, colors) {
    var mappedColors = {},
        count = 0;
    for (var i = 0; i < legendData.length; i++) {
        if (count > colors.length - 1) {
            count = 0;
        }
        mappedColors[legendData[i]] = colors[count];
        count++;
    }
    return mappedColors;
}

/**cleanToolData
 *  cleans incoming toolData for consistency
 *
 * @param toolData
 * @returns object with tooldata
 */
function cleanToolData(options) {
    var data = {};
    if (options) {
        data = options;
    }
    if (!data.hasOwnProperty('rotateAxis')) {
        data.rotateAxis = false;
    }
    if (data.hasOwnProperty('stackToggle')) {
        if (data.stackToggle === 'stack-data') {
            data.stackToggle = true;
        } else {
            data.stackToggle = false;
        }
    } else {
        data.stackToggle = false;
    }
    if (data.hasOwnProperty('colors')) {
        data.color = data.colors;
    }
    if (!data.hasOwnProperty('thresholds')) {
        data.thresholds = [];
    }
    return data;
}

function getMaxWidthForAxisData(axis, axisData, options, dimensions, margin, chartDiv, type) {
    var maxAxisText = '',
        formatType;
    //Dynamic left margin for charts with y axis
    if (options.rotateAxis) {
        //get length of longest text label and make the axis based off that
        var maxString = '',
            height = parseInt(dimensions.height) - margin.top - margin.bottom;

        //check if labels should be shown
        if (height !== 0 && height / axisData.values.length < parseInt(options.fontSize)) {
            axisData.hideValues = true;
        } else {
            for (var i = 0; i < axisData.values.length; i++) {
                var currentStr = axisData.values[i].toString();
                if (currentStr.length > maxString.length) {
                    maxString = currentStr;
                }
            }
            maxAxisText = maxString;
        }
    } else if (!!options.yLabelFormat || !!options.xLabelFormat) {
        var labelFormat = options.yLabelFormat;
        if (axis === 'x') {
            labelFormat = options.xLabelFormat;
        }

        formatType = jvFormatValueType(axisData.values);
        var expression = getFormatExpression(labelFormat);
        if (expression !== '') {
            maxAxisText = expression(axisData.max);
        } else {
            maxAxisText = jvFormatValue(axisData.max);
        }
    } else {
        formatType = jvFormatValueType(axisData.values);
        if (!axisData.hasOwnProperty('max')) {
            var maxLength = 0;
            for (var i = 0; i < axisData.values.length; i++) {
                if (axisData.values[i].length > maxLength) {
                    maxLength = axisData.values[i].length;
                    maxAxisText = axisData.values[i];
                }
            }
        } else {
            maxAxisText = jvFormatValue(axisData.max, formatType);
        }
    }

    if (type === 'heatmap') {
        //also need to check width of label
        if (maxAxisText.length < axisData.label.length + 5) {
            //need added space
            if (axis === 'x') {
                maxAxisText = axisData.label;
            } else {
                maxAxisText = axisData.label + 'Extra';
            }
        }
    }

    //Create dummy svg to place max sized text element on
    var dummySVG = chartDiv.append('svg').attr('class', 'dummy-svg');

    //Create dummy text element
    var axisDummy = dummySVG.append('text').attr('font-size', function () {
        if (axis === 'y' && options.yLabelFontSize !== 'none') {
            return options.yLabelFontSize;
        }
        if (axis === 'x' && options.xLabelFontSize !== 'none') {
            return options.xLabelFontSize;
        }
        return options.fontSize;
    }).attr('x', 0).attr('y', 0).text(maxAxisText);

    //Calculate the width of the dummy text
    var width = axisDummy.node().getBBox().width;
    //Remove the svg and text element
    chartDiv.select('.dummy-svg').remove();
    return width;
}

function values(object, dataTableAlign, type) {
    var valuesArray = [];

    if (type === 'bar' || type === 'pie' || type === 'line' || type === 'area') {
        //for (var key in object) {
        for (var i = 1; i < _.keys(dataTableAlign).length; i++) {
            if (dataTableAlign.hasOwnProperty('value ' + i)) {
                if (object[dataTableAlign['value ' + i]] != null) {
                    //!= checks for null
                    valuesArray.push(object[dataTableAlign['value ' + i]]);
                }
            }
        }
    } else {
        for (var key in object) {
            if (object.hasOwnProperty(key)) {
                valuesArray.push(object[key]);
            }
        }
    }
    return valuesArray;
}
/**getYScale
 *
 * gets the scale for the y axis
 * @params yAxisData, container, padding
 * @returns {{}}
 */
function getYScale(yAxisData, container, padding, yReversed) {
    var yAxisScale;
    var leftPadding = 0.4,
        rightPadding = 0.2;
    if (padding === 'no-padding') {
        leftPadding = 0;
        rightPadding = 0;
    }

    if (yAxisData.dataType === 'STRING') {
        yAxisScale = d3.scale.ordinal().domain(yAxisData.values).rangePoints([0, container.height]).rangeRoundBands([0, container.height], leftPadding, rightPadding);
    } else if (yAxisData.dataType === 'NUMBER') {
        var max = yAxisData.values[yAxisData.values.length - 1];
        var min = yAxisData.values[0];
        if (yReversed) {
            yAxisScale = d3.scaleLinear().domain([max, min]).rangeRound([container.height, 0]);
        } else {
            yAxisScale = d3.scaleLinear().domain([max, min]).rangeRound([0, container.height]);
        }
    }
    return yAxisScale;
}
/**getZScale
 *
 * gets the scale for the z axis
 * @params zAxisData, container, padding
 * @returns {{}}
 */
function getZScale(zAxisData, container, options) {
    var zAxisScale;

    zAxisScale = d3.scaleLinear().domain([d3.min(zAxisData.values), d3.max(zAxisData.values)]).rangeRound([options.NODE_MIN_SIZE, options.NODE_MAX_SIZE]).nice();
    return zAxisScale;
}

/**generateEventGroups
 *
 *
 * @params chartContainer, barData, chart
 */
function generateEventGroups(chartContainer, barData, chart) {
    var container = chart.config.container,
        options = chart.options,
        dataToPlot = jvCharts.getPlotData(barData, chart),
        eventGroups;

    //Invisible rectangles on screen that represent bar groups. Used to show/hide tool tips on hover
    eventGroups = chartContainer.data(dataToPlot).enter().append('rect').attr('class', 'event-rect').attr('x', function (d, i) {
        //sets the x position of the bar)
        return options.rotateAxis ? 0 : container.width / barData.length * i;
    }).attr('y', function (d, i) {
        //sets the y position of the bar
        return options.rotateAxis ? container.height / barData.length * i : 0;
    }).attr('width', function () {
        //sets the x position of the bar)
        return options.rotateAxis ? container.width : container.width / barData.length;
    }).attr('height', function () {
        //sets the y position of the bar
        return options.rotateAxis ? container.height / barData.length : container.height;
    }).attr('fill', 'transparent').attr('class', function (d, i) {
        return 'event-rect editable-bar bar-col-' + String(barData[i][chart.currentData.dataTable.label]).replace(/\s/g, '_').replace(/\./g, '<dot>');
    });

    return eventGroups;
}

function generateThresholdLegend(chart) {
    var svg = chart.svg;

    var colorLegendData = [];
    if (chart.options.thresholds !== 'none') {
        for (var j = 0; j < Object.keys(chart.options.thresholds).length; j++) {
            colorLegendData.push(chart.options.thresholds[j].thresholdName);
        }
    }

    var gLegend = svg.append('g').attr('class', 'thresholdLegendContainer');

    var legend = gLegend.selectAll('.thresholdLegend').data(colorLegendData).enter().append('g').attr('class', 'thresholdLegend').attr('transform', function (d, i) {
        var height = 19;
        var offset = 19 * colorLegendData.length / 2;
        var horz = -2 * 12;
        var vert = i * height - offset;
        return 'translate(' + horz + ',' + vert + ')';
    });

    legend.append('rect').attr('width', 12).attr('height', 12).style('fill', function (d, i) {
        return chart.options.thresholds[i].thresholdColor;
    });

    legend.append('text').attr('x', 24).attr('y', 8).attr('font-size', '.75em').text(function (d) {
        return d;
    });

    //Centers the legend in the panel
    if (gLegend) {
        var legendWidth = gLegend.node().getBBox().width;
        gLegend.attr('transform', 'translate(' + (chart.config.container.width - legendWidth) + ',' + 10 * colorLegendData.length + ')');
    }
}

function attachClickEventsToLegend(chart, legendElements, drawFunc) {
    //Adding the click event to legend rectangles for toggling on/off

    legendElements.on('click', function () {
        var selectedRect = d3.select(this);
        if (selectedRect._groups[0][0].attributes.opacity.value !== '0.2') {
            selectedRect.attr('opacity', '0.2');
        } else {
            selectedRect.attr('opacity', '1');
        }

        //Gets the headers of the data to be drawn
        var dataHeaders = updateDataFromLegend(legendElements._groups);

        //Sets the legendData to the updated headers
        if (chart.options.seriesFlipped) {
            chart.options.flippedLegendHeaders = dataHeaders;
        } else {
            chart.options.legendHeaders = dataHeaders;
        }

        //Plots the data
        if (chart.options.seriesFlipped) {
            chart[drawFunc](chart.flippedData);
        } else {
            chart[drawFunc](chart.data);
        }
    });
}

/**generateVerticalLegendElements
 *
 * Creates the legend elements--rectangles and labels
 * @params chart, legendData, drawFunc
 */
function generateVerticalLegendElements(chart, legendData, drawFunc) {
    var svg = chart.svg,
        options = chart.options,
        legend,
        legendDataLength = legendData.length,
        legendElementToggleArray;

    options.gridSize = 20;
    options.legendMax = 9;

    if (!options.legendIndex) {
        options.legendIndex = 0;
    }

    if (!options.legendIndexMax) {
        options.legendIndexMax = Math.floor(legendDataLength / options.legendMax - 0.01);
    }

    //Check to see if legend element toggle array needs to be set
    if (options.legendIndexMax >= 0) {
        if (!options.legendHeaders) {
            options.legendHeaders = JSON.parse(JSON.stringify(legendData));
        }

        legendElementToggleArray = getLegendElementToggleArray(options.legendHeaders, legendData);
    }

    legend = svg.append('g').attr('class', 'legend').attr('transform', 'translate(' + 18 + ',' + 20 + ')');

    //Adding colored rectangles to the legend
    var legendRectangles = legend.selectAll('rect').data(legendData).enter().append('rect').attr('class', 'legendRect').attr('x', '3').attr('y', function (d, i) {
        return options.gridSize * (i % options.legendMax) * 1.1;
    }).attr('width', options.gridSize).attr('height', options.gridSize).attr('fill', function (d, i) {
        if (!legendElementToggleArray && !chart.options.seriesFlipped || chart.options.seriesFlipped && !legendElementToggleArray) {
            return getColors(options.color, i, legendData[i]);
        }
        if (!chart.options.seriesFlipped && legendElementToggleArray[i].toggle === true || chart.options.seriesFlipped && legendElementToggleArray[i].toggle === true) {
            return getColors(options.color, i, legendData[i]);
        }
        return '#FFFFFF';
    }).attr('display', function (d, i) {
        if (i >= options.legendIndex * options.legendMax && i <= options.legendIndex * options.legendMax + (options.legendMax - 1)) {
            return 'all';
        }
        return 'none';
    }).attr('opacity', '1');

    //Adding text labels for each rectangle in legend
    var legendText = legend.selectAll('text').data(legendData).enter().append('text').attr('class', function (d, i) {
        return 'legendText editable editable-text editable-content editable-legend-' + i;
    }).attr('x', options.gridSize + 7).attr('y', function (d, i) {
        return options.gridSize * (i % options.legendMax) * 1.1 + 10;
    }).attr('text-anchor', 'start').attr('dy', '0.35em') //Vertically align with node
    .attr('fill', 'black').attr('font-size', chart.options.fontSize).attr('display', function (d, i) {
        if (i >= options.legendIndex * options.legendMax && i <= options.legendIndex * options.legendMax + (options.legendMax - 1)) {
            return 'all';
        }
        return 'none';
    }).text(function (d, i) {
        var elementName = legendData[i];
        if (elementName.length > 20) {
            return elementName.substring(0, 19) + '...';
        }
        return elementName;
    });

    //Adding info box to legend elements when hovering over
    legendText.data(legendData).append('svg:title').text(function (d) {
        return d;
    });

    //Only create carousel if the number of elements exceeds one legend "page"
    if (options.legendIndexMax > 0) {
        createVerticalCarousel(chart, legendData, drawFunc);
    }

    return legendRectangles;
}

/**createVerticalCarousel
 *
 * Draws the vertical legend carousel
 * @params chart, legendData, drawFunc
 */
function createVerticalCarousel(chart, legendData, drawFunc) {
    var svg = chart.svg,
        options = chart.options,
        legendPolygon;

    //Adding carousel to legend
    svg.selectAll('.legend-carousel').remove();
    svg.selectAll('#legend-text-index').remove();

    legendPolygon = svg.append('g').attr('class', 'legend-carousel');

    //Creates left navigation arrow for carousel
    legendPolygon.append('polygon').attr('id', 'leftChevron').attr('class', 'pointer-cursor').style('fill', '#c2c2d6').attr('transform', 'translate(0,' + (options.legendMax * options.gridSize + 50) + ')').attr('points', '0,7.5, 15,0, 15,15').on('click', function () {
        if (options.legendIndex >= 1) {
            options.legendIndex--;
        }
        svg.selectAll('.legend').remove();
        var legendElements = generateVerticalLegendElements(chart, legendData, drawFunc);
        attachClickEventsToLegend(chart, legendElements, drawFunc, legendData);
        chart.localCallbackApplyEdits();
    }).attr({
        display: function display() {
            if (options.legendIndex === 0) {
                return 'none';
            }
            return 'all';
        }
    });

    //Creates page number for carousel navigation
    legendPolygon.append('text').attr('id', 'legend-text-index').attr('x', 35).attr('y', 242.5).style('text-anchor', 'start').style('font-size', chart.options.fontSize).text(function () {
        return options.legendIndex + ' / ' + options.legendIndexMax;
    }).attr({
        display: function display() {
            if (options.legendIndexMax === 0) {
                return 'none';
            }
            return 'all';
        }
    });

    //Creates right navigation arrow for carousel
    legendPolygon.append('polygon').attr('id', 'rightChevron').attr('class', 'pointer-cursor').style('fill', '#c2c2d6').attr('transform', 'translate(85,' + (options.legendMax * options.gridSize + 50) + ')').attr('points', '15,7.5, 0,0, 0,15').on('click', function () {
        if (options.legendIndex < options.legendIndexMax) {
            options.legendIndex++;
        }
        svg.selectAll('.legend').remove();
        var legendElements = generateVerticalLegendElements(chart, legendData, drawFunc);
        attachClickEventsToLegend(chart, legendElements, drawFunc, legendData);
    }).attr({
        display: function display() {
            if (options.legendIndex === options.legendIndexMax) {
                return 'none';
            }
            return 'all';
        }
    });
}

//Bind functions to prototype or jvCharts object
jvCharts.getColors = getColors;
jvCharts.setBarLineLegendData = setBarLineLegendData;
jvCharts.createColorsWithDefault = createColorsWithDefault;
jvCharts.values = values;
jvCharts.getYScale = getYScale;
jvCharts.getZScale = getZScale;
jvCharts.getLegendElementToggleArray = getLegendElementToggleArray;
jvCharts.generateLegendElements = generateLegendElements;
jvCharts.updateDataFromLegend = updateDataFromLegend;
jvCharts.createCarousel = createCarousel;
jvCharts.generateThresholdLegend = generateThresholdLegend;
jvCharts.attachClickEventsToLegend = attachClickEventsToLegend;
jvCharts.generateVerticalLegendElements = generateVerticalLegendElements;
jvCharts.createVerticalCarousel = createVerticalCarousel;
jvCharts.getToggledData = getToggledData;
jvCharts.getPlotData = getPlotData;
jvCharts.getPosCalculations = getPosCalculations;
jvCharts.getXScale = getXScale;
jvCharts.getYScale = getYScale;
jvCharts.setBarLineLegendData = setBarLineLegendData;
jvCharts.jvFormatValue = jvFormatValue;
jvCharts.getFormatExpression = getFormatExpression;
jvCharts.generateEventGroups = generateEventGroups;
jvCharts.jvFormatValueType = jvFormatValueType;
jvCharts.getAxisScale = getAxisScale;
jvCharts.setChartColors = setChartColors;
jvCharts.getDataTypeFromKeys = getDataTypeFromKeys;
jvCharts.cleanToolData = cleanToolData;

module.exports = jvCharts;

},{"./jvTip.js":7}],4:[function(require,module,exports){
"use strict";

/***  jvComment ***/
function jvComment(configObj) {
    "use strict";

    var commentObj = this;
    commentObj.chartDiv = configObj.chartDiv;
    commentObj.showComments = false;
    commentObj.comments = configObj.comments ? configObj.comments : {};
    commentObj.disabled = false;
    commentObj.drawCommentNodes();
    commentObj.toggleCommentMode = function (toggleBool) {
        var entireSvg = commentObj.chartDiv.select("svg");
        if (toggleBool) {
            entireSvg.on('dblclick', function (d) {
                commentObj.makeComment(this);
            });
            entireSvg.on('click', false);
        } else {
            commentObj.removeComment();
        }
    };
    commentObj.saveCallbackFunction = configObj.saveCallbackFunction;
    commentObj.getMode = configObj.getMode;
}
/********************************************* All Comment Mode Functions **************************************************/

jvComment.prototype.makeComment = function (event) {
    var commentObj = this;

    commentObj.showComments = false;
    commentObj.chartDiv.selectAll(".commentbox-readonly").remove();

    if (commentObj.chartDiv.selectAll(".commentbox")._groups[0].length === 0 && commentObj.chartDiv.selectAll(".commentbox-edit")._groups[0].length === 0) {
        var x = parseInt(d3.mouse(event)[0]);
        var y = parseInt(d3.mouse(event)[1]);

        //calculate position of overlay div
        var commentHeight = 145,
            commentWidth = 200,
            position = commentObj.overlayDivPosition(commentWidth, commentHeight, x, y);

        commentObj.chartDiv.append('div').attr("class", "commentbox").attr("id", "commentbox").style("opacity", 1).html("<div class='title'><b>Add New Comment</b></div>" + "<textarea placeholder='Enter comment...' form='commentform' style='resize:none' class='comment-textarea' rows='4' cols='27' name='comment' id = 'textarea1'></textarea>" + "<br><button class='commentbox-close' id ='cancel'><i class='fa fa-close'></i></button>" + "<button class='smss-btn commentbox-submit' id = 'submit'>Submit Comment</button>").style("position", "absolute").style("left", position.x + "px").style("top", position.y + "px");

        //Autofocus on the text area
        document.getElementById("textarea1").focus();

        commentObj.chartDiv.selectAll(".commentbox").select("#cancel").on("click.delete", function () {
            commentObj.removeComment();
        });

        var commentType = 'svgMain';

        commentObj.chartDiv.selectAll(".commentbox").select("#submit").on("click.save", function () {
            var commentText = commentObj.chartDiv.select("#commentbox").select("#textarea1")._groups[0][0].value,
                newCommentObj = {
                'commentText': commentText,
                'groupID': 0,
                'type': commentType,
                'binding': {
                    'x': x,
                    'y': y,
                    'xChartArea': commentObj.chartDiv._groups[0][0].clientWidth,
                    'yChartArea': commentObj.chartDiv._groups[0][0].clientHeight,
                    'currentX': x,
                    'currentY': y
                }
            };
            commentObj.chartDiv.select(".commentbox").remove();
            if (isNaN(commentObj.comments.maxId)) {
                commentObj.comments.maxId = -1;
            }
            commentObj.saveCallbackFunction(newCommentObj, ++commentObj.comments.maxId, 'add');
        });
    }
};

jvComment.prototype.removeComment = function () {
    var commentObj = this;
    var chartDiv = commentObj.chartDiv;
    chartDiv.selectAll('.commentbox').remove();
};

jvComment.prototype.showAllComments = function () {
    var commentObj = this;

    //Remove any comment boxes if comments are being toggled
    commentObj.chartDiv.selectAll(".commentbox").remove();
    commentObj.chartDiv.selectAll(".commentbox-edit").remove();

    if (commentObj.showComments === false) {
        for (var i in commentObj.comments.list) {

            if (!commentObj.comments.list[i]['binding']) {
                console.log("Comment is in old format, will not display");
                return;
            }

            var value = commentObj.comments.list[i];

            var chartAreaWidth = commentObj.chartDiv._groups[0][0].clientWidth;
            var chartAreaHeight = commentObj.chartDiv._groups[0][0].clientHeight;

            var x = commentObj.comments.list[i]['binding'].x / commentObj.comments.list[i]['binding'].xChartArea * chartAreaWidth;
            var y = commentObj.comments.list[i]['binding'].y / commentObj.comments.list[i]['binding'].yChartArea * chartAreaHeight;

            var commentText = value['commentText'];

            var commentHeight = 80,
                commentWidth = 185,
                position = commentObj.overlayDivPosition(commentWidth, commentHeight, x, y);

            commentObj.chartDiv.append('div').attr("class", "commentbox-readonly").attr("id", "commentbox-readonly" + i).style("position", "absolute").style("opacity", 1)
            //.style("border", "1px solid black")
            .html("<textarea readonly style='resize:none' class='comment-textarea' rows='4' cols='27' name='comment'>" + commentText + "</textarea>").style("left", position.x + "px").style("top", position.y + "px");
        }
        commentObj.showComments = true;
        //chart.toolBar.select("#topBarButton"+chart.config.name+"showallcomments").select('button').classed('toggled', true);
    } else {
        commentObj.chartDiv.selectAll(".commentbox-readonly").remove();
        commentObj.showComments = false;
        //chart.toolBar.select("#topBarButton"+chart.config.name+"showallcomments").select('button').classed('toggled', false);
    }
};

jvComment.prototype.drawCommentNodes = function () {
    var commentObj = this;

    var comments = commentObj.comments.list;
    var chartDiv = commentObj.chartDiv;
    var svg = chartDiv.select("svg");

    svg.selectAll(".min-comment").remove();

    for (var i in comments) {

        if (typeof chartDiv._groups == 'undefined') {
            console.log("Comment data is in old format, will not display or chart div doesnt exist");
            return;
        }

        if (!comments[i]['binding'] || !chartDiv._groups[0][0]) {
            console.log("Comment data is in old format, will not display or chart div doesnt exist");
            return;
        }

        var chartAreaWidth = chartDiv._groups[0][0].clientWidth;
        var chartAreaHeight = chartDiv._groups[0][0].clientHeight;

        var x = comments[i]['binding'].x / comments[i]['binding'].xChartArea * chartAreaWidth;
        var y = comments[i]['binding'].y / comments[i]['binding'].yChartArea * chartAreaHeight;

        comments[i]['binding'].currentX = comments[i]['binding'].x / comments[i]['binding'].xChartArea * chartAreaWidth;
        comments[i]['binding'].currentY = comments[i]['binding'].y / comments[i]['binding'].yChartArea * chartAreaHeight;

        var commentNode = svg.append("text").attr("class", "min-comment").attr("id", "node" + i).attr("fill", "#e6e6e6").attr("x", x).attr("y", y).attr("font-family", "FontAwesome").attr("stroke", "darkgray").attr('font-size', function (d) {
            return '15px';
        }).text(function (d) {
            return "\uF0E5";
        }).attr("opacity", 1).on("dblclick.comment", function (node) {
            //Edit text or delete the comment
            if (chartDiv.selectAll(".commentbox-edit")._groups[0].length === 0 && chartDiv.selectAll(".commentbox")._groups[0].length === 0) {
                //No comments are open
                if (commentObj.getMode() === 'comment-mode') {
                    commentObj.showComments = false;
                    chartDiv.selectAll(".commentbox-readonly").remove();
                    var commentText = "";
                    var currentComment;

                    for (var j in commentObj.comments.list) {
                        if (Math.round(commentObj.comments.list[j]['binding'].currentX) === Math.round(this.x.baseVal[0].value)) {
                            if (Math.round(commentObj.comments.list[j]['binding'].currentY) === Math.round(this.y.baseVal[0].value)) {
                                commentText = commentObj.comments.list[j].commentText;
                                x = commentObj.comments.list[j]['binding'].currentX;
                                y = commentObj.comments.list[j]['binding'].currentY;
                                currentComment = j;
                            }
                        }
                    }
                    var commentHeight = 145,
                        commentWidth = 200,
                        position = commentObj.overlayDivPosition(commentWidth, commentHeight, x, y);
                    chartDiv.append('div').attr("class", "commentbox-edit").style("opacity", 1).style("left", position.x + "px").style("top", position.y + "px").style("position", "absolute")
                    //.style("border", "1px solid black")
                    .html("<div class='title'><b>Edit Comment</b></div>" + "<textarea id='edit' style='resize:none' class='comment-textarea' rows='4' cols='27' name='comment'>" + commentText + "</textarea>" + "<br><button class='commentbox-close' id ='cancel-edit'><i class='fa fa-close'></i></button>" + "<button class='smss-btn' id ='delete'>Delete</button>" + "<button class='smss-btn' id = 'save'>Save</button>");

                    chartDiv.selectAll(".commentbox-edit").select("#delete").on("click.delete", function () {
                        chartDiv.select(".commentbox-edit").remove();
                        chartDiv.select(".commentbox-readonly").remove();
                        chartDiv.select("#node" + currentComment).attr("display", "none");

                        //redraw comment nodes with new indexes
                        commentObj.saveCallbackFunction(commentObj.comments.list[currentComment], currentComment, 'remove');
                    });

                    chartDiv.selectAll(".commentbox-edit").select("#save").on("click.save", function () {
                        var commentText = chartDiv.select(".commentbox-edit").select("#edit")._groups[0][0].value;
                        commentObj.comments.list[currentComment].commentText = commentText;
                        chartDiv.select(".commentbox-readonly").remove();
                        chartDiv.select(".commentbox-edit").remove();
                        commentObj.saveCallbackFunction(commentObj.comments.list[currentComment], currentComment, 'edit');
                    });

                    chartDiv.selectAll(".commentbox-edit").select("#cancel-edit").on("click.cancel-edit", function () {
                        chartDiv.select(".commentbox-readonly").remove();
                        chartDiv.select(".commentbox-edit").remove();
                    });
                } else {
                    return null;
                }
            }
        }).on("mouseenter.comment", function (d) {
            //Show hover over box when mouse enters node
            if (commentObj.showComments === false) {
                var commentText = "";

                for (var j in commentObj.comments.list) {
                    if (Math.round(commentObj.comments.list[j]['binding'].currentX) === Math.round(this.x.baseVal[0].value)) {
                        if (Math.round(commentObj.comments.list[j]['binding'].currentY) === Math.round(this.y.baseVal[0].value)) {
                            commentText = commentObj.comments.list[j]['commentText'];
                            x = commentObj.comments.list[j]['binding'].currentX;
                            y = commentObj.comments.list[j]['binding'].currentY;
                        }
                    }
                }

                var commentHeight = 80,
                    commentWidth = 185,
                    position = commentObj.overlayDivPosition(commentWidth, commentHeight, x, y);

                var commentDiv = chartDiv.append('div').attr("class", "commentbox-readonly").style("opacity", 1).style("position", "absolute")
                //.style("border", "1px solid black")
                .html("<textarea readonly rows='4' style='resize:none' cols='27' class='textarea' name='comment'>" + commentText + "</textarea>").style("left", position.x + "px").style("top", position.y + "px");
            }
        }).on("mouseout.comment", function (d) {
            //Remove hover over box when mouse moves away
            if (commentObj.showComments === false) {
                chartDiv.select(".commentbox-readonly").remove();
            }
        });
    }
};

/******************************* Utility functions **********************************************/

jvComment.prototype.overlayDivPosition = function (divWidth, divHeight, mouseX, mouseY) {
    var commentObj = this;
    var position = {};
    if (mouseX > parseInt(commentObj.chartDiv.style('width')) / 2) {
        position.x = mouseX - divWidth - 5;
    } else {
        position.x = mouseX + 10;
    }
    if (mouseY - divHeight - 10 > 0) {
        position.y = mouseY - divHeight - 10;
    } else {
        position.y = mouseY + 10;
    }
    return position;
};

module.exports = jvComment;

},{}],5:[function(require,module,exports){
'use strict';

/***  jvEdit ***/
function jvEdit(configObj) {
    "use strict";

    var editObj = this;
    editObj.chartDiv = configObj.chartDiv;
    editObj.editOptions = '';
    editObj.vizOptions = configObj.vizOptions ? configObj.vizOptions : {};
    editObj.fontSizeIncrement = 0;
    editObj.disabled = false;
    editObj.chartDiv.selectAll('.edit-div').remove();
    editObj.editDiv = editObj.chartDiv.append('div').attr('class', 'edit-div semoss-d3-tip absolute');
    editObj.applyAllEdits();
    editObj.saveVizOptions = configObj.saveVizOptionsFunction;
    editObj.toggleEditMode = function (toggleBool) {
        var entireSvg = editObj.chartDiv.select("svg");
        if (toggleBool) {
            entireSvg.selectAll(".event-rect").attr("display", "none");
            entireSvg.on('click', function () {
                //edit mode events
                //going to be mouseover to highlight options for whatever piece you hover over
                var classText = d3.select(d3.event.target).attr('class');
                if (classText) {
                    if (classText.indexOf('editable') >= 0) {
                        editObj.displayEdit(this, classText);
                    }
                }
            });
            entireSvg.selectAll('.editable').classed('pointer', true);
            entireSvg.on('dblclick', false);
        } else {
            editObj.removeEdit();
            entireSvg.selectAll('.editable').classed('pointer', false);
            entireSvg.selectAll(".event-rect").attr("display", "block");
        }
    };
}

/********************************************* All Edit Mode Functions **************************************************/

/** displayEdit
 *
 * Displays the edit div, grabbing it from the template
 *
 */
jvEdit.prototype.displayEdit = function (event, options) {
    var editObj = this;

    //return if you click on the same element twice, no need to display a second edit div if the current one is still open
    if (editObj.editOptions === options) {
        return;
    }
    editObj.editDiv.html('');
    editObj.editOptions = options;
    var mouseX = d3.mouse(event)[0],
        mouseY = d3.mouse(event)[1];

    //get the edit template html and then determine which pieces to show
    $.get('resources/js/jvCharts/src/editOptionsTemplate.html', function (data) {
        //assign html to editDiv (basically displays the div)
        editObj.editDiv.html(data);

        //optionValues - an array of strings.
        //      String is the id to the element in the editDiv form.
        //      This string contains the specific option that is being changed

        //itemToChange
        //      String that is the class of the svg element to be changed on the viz itself


        var optionValues = [],
            itemToChange = '',
            editOptionElement = editObj.editDiv.select("#edit-option-element");

        //if statements to determine which edit options to display
        if (options.indexOf('editable-yAxis') >= 0) {
            editOptionElement.html('&nbsp;for Y Axis');
            editOptionElement.style('visibility', 'visible');
            itemToChange = 'yAxis';
        } else if (options.indexOf('editable-xAxis') >= 0) {
            editOptionElement.html('&nbsp;for X Axis');
            editOptionElement.style('visibility', 'visible');
            itemToChange = 'xAxis';
        } else if (options.indexOf('yLabel') >= 0) {
            editOptionElement.html('&nbsp;for Y Label');
            editOptionElement.style('visibility', 'visible');
            itemToChange = 'yLabel';
        } else if (options.indexOf('xLabel') >= 0) {
            editOptionElement.html('&nbsp;for X Label');
            editOptionElement.style('visibility', 'visible');
            itemToChange = 'xLabel';
        } else if (options.indexOf('legendText') >= 0) {
            editOptionElement.html('&nbsp;for Legend Item');
            editOptionElement.style('visibility', 'visible');
            itemToChange = options.substring(options.indexOf('editable-legend-')).split(' ')[0];
        } else if (options.indexOf('editable-bar') >= 0) {
            editOptionElement.html('&nbsp;for Bar Chart');
            editOptionElement.style('visibility', 'visible');
            editObj.editDiv.select(".editable-bar").style('display', 'block');
            optionValues.push('editable-bar');
            itemToChange = options.substring(options.indexOf('bar-col-')).split(' ')[0];
        } else if (options.indexOf('editable-pie') >= 0) {
            editOptionElement.html('&nbsp;for Pie Slice');
            editOptionElement.style('visibility', 'visible');
            editObj.editDiv.select(".editable-pie").style('display', 'block');
            optionValues.push('editable-pie');
            itemToChange = options.substring(options.indexOf('pie-slice-')).split(' ')[0];
        } else if (options.indexOf('editable-scatter') >= 0) {
            editOptionElement.html('&nbsp;for Scatter Plot');
            editOptionElement.style('visibility', 'visible');
            editObj.editDiv.select(".editable-scatter").style('display', 'block');
            optionValues.push('editable-scatter');
            itemToChange = options.substring(options.indexOf('scatter-circle-')).split(' ')[0];
        } else if (options.indexOf('editable-svg') >= 0) {
            editOptionElement.html('&nbsp;for All Text');
            editOptionElement.style('visibility', 'visible');
            editObj.editDiv.select(".editable-text-size-buttons").style('display', 'block');
            //editObj.editDiv.select(".editable-default-and-apply").style('display', 'none');
            optionValues.push('editable-text-size');
            itemToChange = 'svg';
        } else {
            console.log("Still need to add option to display edit");
        }

        if (options.indexOf('editable-num') >= 0) {
            editObj.editDiv.select(".editable-num-format").style('display', 'block');
            optionValues.push('editable-num-format');
        }
        if (options.indexOf('editable-text') >= 0) {
            editObj.editDiv.select(".editable-text-color").style('display', 'block');
            optionValues.push('editable-text-color');
            editObj.editDiv.select(".editable-text-size").style('display', 'block');
            optionValues.push('editable-text-size');
        }
        if (options.indexOf('editable-content') >= 0) {
            editObj.editDiv.select(".editable-content").style('display', 'block');
            optionValues.push('editable-content');
        }

        //populate edit div with initial values
        if (editObj.vizOptions[itemToChange]) {
            populateSelectionsEditMode(editObj.editDiv, editObj.vizOptions[itemToChange]);
        }
        editObj.editDiv.style('display', 'block').style("left", 0 + 'px').style("top", 0 + 'px');

        //calculate position of overlay div
        var editHeight = parseFloat(editObj.editDiv.style('height')),
            editWidth = parseFloat(editObj.editDiv.style('width')),
            position = editObj.overlayDivPosition(editWidth, editHeight, mouseX, mouseY);

        //show the new edit div
        editObj.editDiv.style("left", position.x + 'px').style("top", position.y + 'px');

        //add submit, default, and exit listeners to the div
        editObj.editDiv.select('#submitEditMode').on("click", function () {
            submitEditMode(editObj, optionValues, itemToChange);
            editObj.removeEdit();
        });
        editObj.editDiv.select('#submitEditModeDefault').on("click", function () {
            submitEditMode(editObj, optionValues, itemToChange, true);
            editObj.removeEdit();
        });
        editObj.editDiv.select('#exitEditMode').on("click", function () {
            editObj.removeEdit();
        });
        editObj.fontSizeIncrement = 0;
        //Adding click events for increase/decrease font size buttons
        editObj.editDiv.select("#increaseFontSize").on("click", function () {
            editObj.increaseFontSize();
        });
        editObj.editDiv.select("#decreaseFontSize").on("click", function () {
            editObj.decreaseFontSize();
        });
    });
};

/** increaseFontSize
 *
 * Increases the font size by 1 when increased via edit options for all text
 *
 */
jvEdit.prototype.increaseFontSize = function () {
    var editObj = this,
        fontIncrement = 1,
        maxSize = 28;
    if (editObj.fontSizeIncrement < maxSize) {
        editObj.changeFontSize(fontIncrement);
        editObj.fontSizeIncrement++;
        editObj.vizOptions["text"] = { 'editable-text-increment': editObj.fontSizeIncrement };
    }
};

/** decreaseFontSize
 *
 * Decreases the font size by 1 when decreased via edit options for all text
 *
 */
jvEdit.prototype.decreaseFontSize = function () {
    var editObj = this,
        fontDecrement = -1,
        minSize = -12;
    //min size is neg 12 because default size is 12px on our charts
    if (editObj.fontSizeIncrement > minSize) {
        editObj.changeFontSize(fontDecrement);
        editObj.fontSizeIncrement--;
        editObj.vizOptions["text"] = { 'editable-text-increment': editObj.fontSizeIncrement };
    }
};

/** changeFontSize
 *
 * Increases or decreases font size by a certain increment
 *
 */
jvEdit.prototype.changeFontSize = function (increment) {
    var editObj = this,
        newSize;

    editObj.chartDiv.selectAll('text').each(function (d, i) {
        var thisDiv = this,
            textSize = 12;
        if (thisDiv.getAttribute('font-size')) {
            textSize = thisDiv.getAttribute('font-size');
        }
        newSize = parseInt(textSize) + increment;
        thisDiv.setAttribute('font-size', newSize);
    });
};

/** populateSelectionsEditMode
 *
 * Initially populates the editDiv if there are vizOptions
 *
 */
function populateSelectionsEditMode(editDiv, vizOptions) {
    for (var option in vizOptions) {
        if (vizOptions.hasOwnProperty(option)) {
            var selectedObject = editDiv.select('#' + option)._groups[0][0];
            //default color inputs to gray
            if (vizOptions[option] === 'default') {
                if (selectedObject.type === 'color') {
                    if (selectedObject.id.indexOf('text') > 0) {
                        selectedObject.value = '#000000';
                    } else {
                        selectedObject.value = '#aaaaaa';
                    }
                }
            } else {
                selectedObject.value = vizOptions[option];
            }
        }
    }
}

/** submitEditMode
 *
 *
 */
function submitEditMode(editObj, optionValues, itemToChange, defaultBtnClicked) {
    var optionArray = optionValues,
        selectedEditOptions = {},
        editValue,
        selectedObj;

    for (var i = 0; i < optionArray.length; i++) {
        if (optionArray[i].indexOf('editable-legend') > 0) {
            //change item to change for legend elements
            itemToChange = optionArray[i];
        }
        selectedObj = editObj.editDiv.select('#' + optionArray[i]);
        //see if selected object exists
        if (selectedObj && selectedObj._groups[0] && selectedObj._groups[0][0]) {
            editValue = selectedObj._groups[0][0].value;
            //get selected option from edit div
            if (optionArray[i] === 'editable-content' && editValue === '') {
                //dont add an empty string to the viz options for editable content
                break;
            }
            selectedEditOptions[optionArray[i]] = editValue;
            if (!selectedEditOptions[optionArray[i]] && optionArray[i].indexOf('content') < 0) {
                selectedEditOptions[optionArray[i]] = 'default';
            }
        }
    }

    if (defaultBtnClicked) {
        if (itemToChange === 'svg') {
            delete editObj.vizOptions['text'];
        }
        delete editObj.vizOptions[itemToChange];
    } else {
        editObj.vizOptions[itemToChange] = selectedEditOptions;
    }

    if (itemToChange === 'svg') {
        delete editObj.vizOptions['svg'];
    }

    //save vizOptions
    editObj.saveVizOptions(editObj.vizOptions);
}

jvEdit.prototype.applyEditMode = function (itemToChange, options) {
    var editObj = this;
    var object = editObj.chartDiv.select("." + itemToChange);
    var objectGroups = object._groups;
    var objectTagName = objectGroups[0][0] ? objectGroups[0][0].tagName.toLowerCase() : null;

    if (itemToChange === 'text') {
        //do something if it is all the text that is being changed
        object = editObj.chartDiv.selectAll("text");
    }

    //options by tagName
    if (objectTagName === 'g') {
        object = editObj.chartDiv.select("." + itemToChange).selectAll('text');
    } else if (objectTagName === 'rect') {
        if (options['editable-bar']) {
            object.attr('fill', options['editable-bar']);
        }
    } else if (objectTagName === 'circle') {
        if (options['editable-scatter']) {
            object.attr('fill', options['editable-scatter']);
        }
    } else if (objectTagName === 'path') {
        if (options['editable-pie']) {
            object.attr('fill', options['editable-pie']);
        }
    }

    //standard options
    //If a text increment exists, apply it based on the sign of the variable
    if (options.hasOwnProperty('editable-text-increment')) {
        editObj.changeFontSize(options['editable-text-increment']);
    }
    if (options.hasOwnProperty('editable-text-size')) {
        object.style('font-size', options['editable-text-size']);
    }
    if (options.hasOwnProperty('editable-text-color')) {
        object.style('fill', options['editable-text-color']);
    }
    if (options.hasOwnProperty('editable-num-format')) {
        var expression = getFormatExpression(options['editable-num-format']);
        object.transition().text(function (d) {
            if (!isNaN(d) && typeof expression === 'function') {
                return expression(d);
            }
            return d;
        });
    }
    if (options.hasOwnProperty('editable-content')) {
        if (options['editable-content'].length > 0) {
            object.html(options['editable-content']);
        }
    }
    editObj.removeEdit();
};

jvEdit.prototype.applyAllEdits = function () {
    var editObj = this;

    for (var option in editObj.vizOptions) {
        if (editObj.vizOptions.hasOwnProperty(option) && editObj.chartDiv.select(option)) {
            editObj.applyEditMode(option, editObj.vizOptions[option]);
        }
    }
};

jvEdit.prototype.removeEdit = function () {
    var editObj = this;
    if (editObj.editDiv) {
        editObj.editDiv.html('');
        editObj.editDiv.style('display', 'none');
    }
    editObj.editOptions = '';
};

/******************************* Utility functions **********************************************/

jvEdit.prototype.overlayDivPosition = function (divWidth, divHeight, mouseX, mouseY) {
    var editObj = this;
    var position = {};
    if (mouseX > parseInt(editObj.chartDiv.style('width')) / 2) {
        position.x = mouseX - divWidth;
    } else {
        position.x = mouseX;
    }
    if (mouseY - divHeight - 10 > 0) {
        position.y = mouseY - divHeight - 10;
    } else {
        position.y = mouseY + 10;
    }
    return position;
};

/** getFormatExpression
 *
 * @desc returns the d3 format expression for a given option
 * @params option
 * @returns string expression
 */
function getFormatExpression(option) {
    var expression = '';
    if (option === "currency") {
        expression = d3.format("$,");
    }
    if (option === "fixedCurrency") {
        expression = d3.format("($.2f");
    }
    if (option === "percent") {
        var p = Math.max(0, d3.precisionFixed(0.05) - 2);
        expression = d3.format("." + p + "%");
    }
    if (option === "millions") {
        var p = d3.precisionPrefix(1e5, 1.3e6);
        expression = d3.formatPrefix("." + p, 1.3e6);
    }
    if (option === 'commas') {
        expression = d3.format(",.0f");
    }
    if (option === 'none' || option === '') {
        expression = d3.format("");
    }

    return expression;
}

function getYAxisLabelWidth(textSize) {}

module.exports = jvEdit;

},{}],6:[function(require,module,exports){
"use strict";

/***  jvEdit ***/
function jvSelect(configObj) {
    "use strict";

    var selectObj = this;
    selectObj.chartDiv = configObj.chartDiv;
    selectObj.toggleSelectMode = function (toggleBool) {
        var entireSvg = selectObj.chartDiv.select("svg");
        if (toggleBool) {
            entireSvg.on('click', function () {
                var target = d3.select(d3.event.target);
                console.log(target);
            });
            entireSvg.on('dblclick', false);
        } else {}
    };
}

/********************************************* Select Mode Functions **************************************************/

module.exports = jvSelect;

},{}],7:[function(require,module,exports){
"use strict";

/***  jvTip ***/

function jvTip(configObj) {
    "use strict";

    var tip = this;

    tip.type = configObj.type;
    tip.chartDiv = configObj.chartDiv;

    //Create initial div
    tip.chartDiv.select('.jv-tooltip').remove();

    tip.chartDiv.append("div").attr("class", "tooltip jv-tooltip").style("pointer-events", "none");
}

jvTip.prototype.showTip = function () {
    var tip = this;
    return;
    //todo position tip properly
    tip.toolTip.style("display", "block");
};

jvTip.prototype.hideTip = function () {
    var tip = this;
    if (tip.toolTip) {
        tip.toolTip.style("display", "none");
    }
};

/************************************************* Viz Specific Functions ***********************************************************************************************************/

jvTip.prototype.generateSimpleTip = function (dataObj, dataTable, event) {
    return;
    var tip = this;
    //Logic to determine where tooltip will be placed on page
    var leftOfMouse = false,
        topOfMouse = false;
    if (event.offsetX > tip.chartDiv._groups[0][0].clientWidth / 2) {
        leftOfMouse = true;
    }
    if (event.offsetY < tip.chartDiv._groups[0][0].clientHeight / 2) {
        topOfMouse = true;
    }
    if (dataObj.hasOwnProperty('title') && dataObj.title === '') {
        dataObj.title = 'Empty';
    }

    tip.toolTip = tip.chartDiv.select(".tooltip").html(function () {
        if (dataObj.viz === 'clusters' || dataObj.viz === 'circleviewplot' || dataObj.viz === 'scatterplot' || dataObj.viz === 'treemap' || dataObj.viz === 'singleaxis') {
            return generateSingleColorHTML(dataObj, dataTable);
        } else if (dataObj.viz === 'radial' || dataObj.viz === 'pie') {
            return generatePieHTML(dataObj, dataTable);
        } else if (dataObj.viz === 'circlepack' || dataObj.viz === 'jvsunburst') {
            return generatePackHTML(dataObj, dataTable);
        } else if (dataObj.viz === 'heatmap' || dataObj.viz === 'cloud') {
            return generateHeatmapHTML(dataObj, dataTable);
        } else if (dataObj.viz === 'sankey') {
            return generateSankeyHTML(dataObj, dataTable);
        } else {
            return generateSimpleHTML(dataObj, dataTable);
        }
    }).style("right", "auto").style("left", "auto").style("top", "auto").style("bottom", "auto").style("display", "block").style("opacity", 1);

    var fullPage = d3.select('html')._groups[0][0];
    var relativePositioning = fullPage.clientWidth - tip.chartDiv._groups[0][0].clientWidth;

    if (relativePositioning > 10) {
        tip.toolTip.style("left", event.target.getBBox().x + "px");
        tip.toolTip.style("top", event.target.getBBox().y + "px");
    } else {
        if (leftOfMouse) {
            tip.toolTip.style("right", tip.chartDiv._groups[0][0].clientWidth - event.offsetX + "px");
        } else {
            tip.toolTip.style("left", event.offsetX + "px");
        }

        if (topOfMouse) {
            tip.toolTip.style("top", event.offsetY + "px");
        } else {
            tip.toolTip.style("bottom", tip.chartDiv._groups[0][0].clientHeight - event.offsetY + "px");
        }
    }

    if (dataObj.viz === 'heatmap') {
        tip.toolTip.style("width", "300px");
    }

    return tip.tooltip;
};

function generateSimpleHTML(dataObj) {
    var tooltipText;
    tooltipText = "<div><div class='title sm-left-margin xs-top-margin sm-right-margin'><b>" + dataObj.title + "</b></div><hr style='margin:3px 0 3px 0;'/>";

    for (var item in dataObj.tipData) {
        var value = formatValue(dataObj.tipData[item]);

        tooltipText += "<span class='semoss-d3-tip-content sm-right-margin'>" + "<div class='circleBase d3-tooltip-circle inline sm-right-margin sm-left-margin' style='background: " + dataObj.color[item] + "'>" + "</div>" + item + ": " + value + "</span><br/>";
    }
    tooltipText += "</div>";
    return tooltipText;
}

function generateSingleColorHTML(dataObj, dataTable) {
    var tooltipText,
        tooltipColor,
        showColorCircle = true,
        colorCircle = "";

    if (!!dataObj.color[dataObj.data[dataTable.series]]) {
        tooltipColor = dataObj.color[dataObj.data[dataTable.series]];
    } else if (!!dataObj.color[dataTable.label] && dataObj.viz !== 'singleaxis') {
        tooltipColor = dataObj.color[dataTable.label];
    } else {
        showColorCircle = false;
    }

    if (showColorCircle) {
        colorCircle = "<div class='circleBase d3-tooltip-circle inline sm-right-margin sm-left-margin' style='background: " + tooltipColor + "'>" + "</div>";
    } else {
        colorCircle = "<div class='inline smright margin sm-left-margin'>";
    }

    tooltipText = "<div class='inline'>" + colorCircle + "<div class='title xxs-left-margin xs-top-margin sm-right-margin inline'><b>" + dataObj.title + "</b>" + "</div>" + "<hr style='margin:3px 0 3px 0;'/>";

    for (var item in dataObj.tipData) {
        var value = formatValue(dataObj.tipData[item]);

        tooltipText += "<span class='semoss-d3-tip-content sm-left-margin sm-right-margin'>" + item + ": " + value + "</span><br/>";
    }
    tooltipText += "</div>";
    return tooltipText;
}

function generatePackHTML(dataObj) {
    var tooltipText;
    tooltipText = "<div class='inline'>" + "<div class='circleBase d3-tooltip-circle inline sm-right-margin sm-left-margin' style='background: " + dataObj.data.color + "'>" + "</div>" + "<div class='title xxs-left-margin xs-top-margin sm-right-margin inline'><b>" + dataObj.title + "</b></div><hr style='margin:3px 0 3px 0;'/>";

    for (var item in dataObj.tipData) {
        var value = formatValue(dataObj.tipData[item]);

        tooltipText += "<span class='semoss-d3-tip-content sm-left-margin sm-right-margin'>" + item + ": " + value + "</span><br/>";
    }
    tooltipText += "</div>";
    return tooltipText;
}

function generateHeatmapHTML(dataObj) {
    var tooltipText;
    tooltipText = "<div class='inline'>" + "<div class='circleBase d3-tooltip-circle inline sm-right-margin sm-left-margin' style='background: " + dataObj.color + "'>" + "</div>" + "<div class='title xxs-left-margin xs-top-margin sm-right-margin inline'><b>" + dataObj.title + "</b></div><hr style='margin:3px 0 3px 0;'/>";

    for (var item in dataObj.tipData) {
        var value = formatValue(dataObj.tipData[item]);

        tooltipText += "<span class='semoss-d3-tip-content sm-left-margin sm-right-margin'>" + item + ": " + value + "</span><br/>";
    }
    tooltipText += "</div>";
    return tooltipText;
}

function generatePieHTML(dataObj, dataTable) {
    var tooltipText;
    tooltipText = "<div class='inline'>" + "<div class='circleBase d3-tooltip-circle inline sm-right-margin sm-left-margin' style='background: " + dataObj.color[dataObj.data.label] + "'>" + "</div>" + "<div class='title xxs-left-margin xs-top-margin sm-right-margin inline'><b>" + dataObj.title + "</b></div><hr style='margin:3px 0 3px 0;'/>";

    for (var item in dataObj.tipData) {
        var value = formatValue(dataObj.tipData[item]);

        tooltipText += "<span class='semoss-d3-tip-content sm-left-margin sm-right-margin'>" + dataTable[item] + ": " + value + "</span><br/>";
    }
    tooltipText += "</div>";
    return tooltipText;
}

function generateSankeyHTML(dataObj) {
    var tooltipText;
    tooltipText = "<div class='inline'>" + "</div>" + "<div class='title xxs-left-margin xs-top-margin sm-right-margin inline'><b>" + dataObj.title + "</b></div><hr style='margin:3px 0 3px 0;'/>";

    for (var item in dataObj.tipData) {
        var value = formatValue(dataObj.tipData[item]);

        tooltipText += "<span class='semoss-d3-tip-content sm-left-margin sm-right-margin'>" + item + ": " + value + "</span><br/>";
    }
    tooltipText += "</div>";
    return tooltipText;
}

function formatValue(val) {
    if (!isNaN(val)) {
        var formatNumber = d3.format(",.0f");
        if (val >= 1000000) {
            //millions
            // var p = d3.precisionPrefix(1e5, 1.3e6);
            // formatNumber = d3.formatPrefix("." + p, 1.3e6);
            formatNumber = d3.format(",.2f");
        } else if (val <= 100) {
            //2 decimals
            formatNumber = d3.format(",.2f");
        }
        return formatNumber(val);
    }
    return val;
}

module.exports = jvTip;

},{}],8:[function(require,module,exports){
'use strict';

var jvCharts = require('./jvCharts.js');

jvCharts.prototype.getDefaultOptions = getDefaultOptions;

function getDefaultOptions() {
    var options = {};

    //General Styles/Attributes
    options.gray = "#cccccc";
    options.strokeWidth = "2px";
    options.black = "#000000";

    //Component Specific Styles/Attributes
    options.axisColor = options.gray;
    options.axisWidth = options.strokeWidth;

    return options;
}

},{"./jvCharts.js":3}],9:[function(require,module,exports){
'use strict';

var jvCharts = require('../jvCharts.js');

jvCharts.prototype.area = {
    paint: paint,
    setData: setData
};

jvCharts.prototype.generateLine = generateLine;
jvCharts.prototype.fillArea = fillArea;
jvCharts.prototype.setLineThresholdData = setLineThresholdData;

/************************************************ Line functions ******************************************************/

/**setLineData
 *  gets line data and adds it to the chart object
 *
 * @params data, dataTable, colors
 */
function setData(chart) {

    //sort chart data if there is a sort type and label in the options
    if (chart.options.sortType) {
        if (chart.options.sortLabel && chart.options.sortType !== 'default') {
            chart.organizeChartData(chart.options.sortLabel, chart.options.sortType, dataTableKeys);
        }
    }
    chart.data.legendData = setBarLineLegendData(chart.data);
    chart.data.xAxisData = chart.setAxisData('x', chart.data);
    chart.data.yAxisData = chart.setAxisData('y', chart.data);

    //define color object for chartData
    chart.data.color = jvCharts.setChartColors(chart.options.color, chart.data.legendData, chart.colors);
};
/**setBarLineLegendData
 *  gets legend info from chart Data
 *
 * @params data, type
 * @returns [] of legend tex
 */
function setBarLineLegendData(data) {
    var legendArray = [];
    for (var item in data.dataTable) {
        if (data.dataTable.hasOwnProperty(item)) {
            if (item !== 'label') {
                legendArray.push(data.dataTable[item]);
            }
        }
    }
    return legendArray;
}
/** paintLineChart
 *
 * The initial starting point for line chart, begins the drawing process. Must already have the data stored in the chart
 * object
 */
function paint(chart) {
    //Uses the original data and then manipulates it based on any existing options
    var dataObj = chart.getBarDataFromOptions();

    //assign current data which is used by all bar chart operations
    chart.currentData = dataObj;

    //Overwrite any pre-existing zoom
    chart.config.zoomEvent = null;

    //generate svg dynamically based on legend data
    chart.generateSVG(dataObj.legendData);
    chart.generateXAxis(dataObj.xAxisData);
    chart.generateYAxis(dataObj.yAxisData);
    chart.generateLegend(dataObj.legendData, 'generateLine');

    if (typeof dataObj.xAxisScale.ticks === "function") {
        chart.formatXAxisLabels(dataObj.xAxisScale.ticks().length);
    } else {
        chart.formatXAxisLabels(dataObj.xAxisScale.domain().length);
    }

    // chart.options.rotateAxis ? chart.drawGridlines(dataObj.xAxisData) : chart.drawGridlines(dataObj.yAxisData);
    //need to save tooltip because it is used in other functions
    // chart.draw.toolTip = chart.generateToolTip(dataObj.chartData);
    chart.generateLine(dataObj);
    //zoom disabled for now
};

/**
 *
 */
function fillArea(lineData) {

    var chart = this,
        svg = chart.svg,
        options = chart.options,
        xAxisData = chart.currentData.xAxisData,
        yAxisData = chart.currentData.yAxisData,
        legendData = chart.currentData.legendData,

    //lineData = chart.currentData.chartData,
    container = chart.config.container,
        colors = options.color;

    //If a legend element is toggled off, use the new list of headers
    if (options.hasOwnProperty('legendHeaders')) {
        legendData = options.legendHeaders;
    }

    //Get the X and Y Scale
    var x = jvCharts.getAxisScale('x', xAxisData, container, 'no-padding', null, options);
    var y = jvCharts.getAxisScale('y', yAxisData, container, 'no-padding', null, options);

    //If axis are normal
    if (!options.rotateAxis) {
        var area = d3.area().x(function (d) {
            return x(d.x);
        }).y0(container.height).y1(function (d) {
            return y(d.y);
        });
    } else {
        var area = d3.area().y(function (d) {
            return y(d.y);
        }).x1(0).x0(function (d) {
            return x(d.x);
        });
    }

    var data = {};

    for (var i = 0; i < lineData.length; i++) {
        for (var k = 0; k < legendData.length; k++) {

            if (typeof legendData !== "undefined") {
                //Accounting for legend toggles
                if (legendData[k].toggle === false) {
                    //Don't write anything to data
                    continue;
                } else {
                    if (!data[legendData[k]]) {
                        data[legendData[k]] = [];
                    }
                    if (!options.rotateAxis) {
                        data[legendData[k]].push({
                            'x': lineData[i][xAxisData.label],
                            'y': parseFloat(lineData[i][legendData[k]])
                        });
                    } else {
                        data[legendData[k]].push({
                            'y': lineData[i][yAxisData.label],
                            'x': parseFloat(lineData[i][legendData[k]])
                        });
                    }
                }
            } else {
                //Initial creation of visualization w/o legend options
                if (!data[legendData[k]]) {
                    data[legendData[k]] = [];
                }
                if (!options.rotateAxis) {
                    data[legendData[k]].push({
                        'x': lineData[i][xAxisData.label],
                        'y': parseFloat(lineData[i][legendData[k]])
                    });
                } else {
                    data[legendData[k]].push({
                        'y': lineData[i][yAxisData.label],
                        'x': parseFloat(lineData[i][legendData[k]])
                    });
                }
            }
        }
    }

    svg.selectAll(".area").remove();

    var ii = 0;
    for (var i in data) {
        svg.append("path").datum(data[i]).attr("class", function (d) {
            if (chart.options.colorLine == true && chart.options.thresholds != 'none' && chart.options.colorChart != false) {
                return "area area-threshold";
            } else {
                return "area";
            }
        }).attr("d", area).attr("fill", function (d) {
            return jvCharts.getColors(colors, k, i);
        }).attr("opacity", 0.6).attr("transform", function (d, i) {
            if (options.rotateAxis) {
                var translation = container.height / lineData.length / 2;
                return "translate(0, " + translation + ")";
            } else {
                var translation = container.width / lineData.length / 2;
                return "translate(" + translation + ", 0)";
            }
        }).attr("pointer-events", "none");
        ii++;
    }
}

/** generateLine
 *
 * Paints the lines
 * @params lineData
 */
function generateLine(lineData) {
    var chart = this,
        svg = chart.svg,
        options = chart.options,
        container = chart.config.container;

    svg.selectAll("g.line-container").remove();

    var translateX = 0;
    var translateY = 0;
    var zoomScale = 1;

    //Used to draw line that appears when tool tips are visible
    var tipLineX = 0,
        tipLineWidth = 0,
        tipLineHeight = 0,
        tipLineY = 0;

    //Setting zoom variables based on if axis is rotated
    if (options.rotateAxis) {
        translateY = typeof zoomEvent === 'undefined' || zoomEvent === null ? 0 : zoomEvent.translate[1]; //translates if there is zoom
        zoomScale = typeof zoomEvent === 'undefined' || zoomEvent === null ? 1 : zoomEvent.scale;

        translateY = Math.min(0, translateY);
        translateY = Math.min(0, Math.max(translateY, container.height - container.height * zoomScale));
    } else {
        translateX = typeof zoomEvent === 'undefined' || zoomEvent === null ? 0 : zoomEvent.translate[0]; //translates if there is zoom
        zoomScale = typeof zoomEvent === 'undefined' || zoomEvent === null ? 1 : zoomEvent.scale;

        translateX = Math.min(0, translateX);
        translateX = Math.min(0, Math.max(translateX, container.width - container.width * zoomScale));
    }

    var colors = options.color,
        x,
        y;

    svg.selectAll("g.line-container").remove();
    var lines = svg.append("g").attr("class", "line-container").selectAll("g");

    var dataHeaders = chart.options.seriesFlipped ? chart.options.flippedLegendHeaders ? chart.options.flippedLegendHeaders : lineData.legendData : chart.options.legendHeaders ? chart.options.legendHeaders : lineData.legendData;

    var lineDataNew = jvCharts.getToggledData(lineData, dataHeaders);

    //If it's an area chart, add the area
    if (chart.config.type === 'area') {
        chart.fillArea(lineDataNew);
    }

    var lineGroups = generateLineGroups(lines, lineDataNew, chart);

    var eventGroups = jvCharts.generateEventGroups(lines, lineDataNew, chart);

    eventGroups.on("mouseover", function (d, i, j) {
        // Transitions in D3 don't support the 'on' function They only exist on selections. So need to move that event listener above transition and after append
        if (chart.draw.showToolTip) {
            //Get tip data
            var tipData = chart.setTipData(d, i);

            //Draw tip line
            chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
        }
    }).on("mousemove", function (d, i) {
        chart.tip.hideTip();
        svg.selectAll(".tip-line").remove();

        if (chart.draw.showToolTip) {
            var tipData = chart.setTipData(d, i);
            chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
        }
    }).on("mouseout", function (d) {
        chart.tip.hideTip();
        svg.selectAll(".tip-line").remove();
    });

    // TODO add tooltips when hovering over the line or circles

    // lineGroups
    //    .on("mouseover", function (d, i, j) {
    //        //console.log(d, i, j);
    //        //if (chart.draw.showToolTip) {
    //        //    chart.draw.tip.show({d: d, i: j}, eventGroups[0][j]);//j is for event rects, i is for bars
    //        //    //offset for tooltip based on mouse position
    //        //    if (options.rotateAxis) {
    //        //        var offset = -1 * (container.width - d3.mouse(this)[0]);//d3.mouse(this)[0];
    //        //        chart.draw.tip.offset([0, offset]);
    //        //    }
    //        //    else {
    //        //        var offset = d3.mouse(this)[1];
    //        //        chart.draw.tip.offset([offset, 0]);
    //        //    }
    //        //    //Draw tip line
    //        //
    //        //    svg
    //        //        .append("line")
    //        //        .attr({
    //        //            "class": "tip-line",
    //        //            "x1": function () {
    //        //                return options.rotateAxis ? 0 : tipLineX + tipLineWidth / 2;
    //        //            },
    //        //            "x2": function () {
    //        //                return options.rotateAxis ? tipLineWidth : tipLineX + tipLineWidth / 2;
    //        //            },
    //        //            "y1": function () {
    //        //                return options.rotateAxis ? tipLineY + tipLineHeight / 2 : 0;
    //        //            },
    //        //            "y2": function () {
    //        //                return options.rotateAxis ? tipLineY + tipLineHeight / 2 : tipLineHeight;
    //        //            },
    //        //            "fill": "none",
    //        //            "shape-rendering": "crispEdges",
    //        //            "stroke": "black",
    //        //            "stroke-width": "1px"
    //        //        });
    //        //}

    //    })
    //    .on("mouseout", function (d) {
    //        chart.draw.tip.hide();
    //        svg.selectAll(".tip-line").remove();
    //    });

    chart.displayValues();
    chart.generateClipPath();
    chart.generateLineThreshold();

    return lines;
};
/** generateLineGroups
 *
 * Paints the groups of the lines
 * @params chartContainer, barData, chart
 */
function generateLineGroups(lineContainer, lineData, chart) {
    var container = chart.config.container,
        options = chart.options,
        xAxisData = chart.currentData.xAxisData,
        yAxisData = chart.currentData.yAxisData,
        legendData = chart.currentData.legendData,
        colors = options.color,
        lines;

    //Get Position Calculations
    var x = jvCharts.getAxisScale('x', xAxisData, container, 'no-padding', null, options);
    var y = jvCharts.getAxisScale('y', yAxisData, container, 'no-padding', null, options);

    var xTranslate, yTranslate;

    if (options.rotateAxis === true) {
        xTranslate = function xTranslate(d, i) {
            return x(d);
        };
        yTranslate = function yTranslate(d, i) {
            return y(lineData[i][yAxisData.label]) + container.height / lineData.length / 2; // + container.height / (lineData.length) / 2  - y.paddingInner());
        };
    } else {
        xTranslate = function xTranslate(d, i) {
            return x(lineData[i][xAxisData.label]) + container.width / lineData.length / 2; // + container.width / (lineData.length) / 2 - x.paddingInner());
        };
        yTranslate = function yTranslate(d, i) {
            return y(d);
        };
    }

    //Append lines and circles

    var data = {};

    for (var i = 0; i < lineData.length; i++) {
        for (var k = 0; k < legendData.length; k++) {

            if (typeof options.legendOptions !== "undefined") {
                //Accounting for legend toggles
                if (options.legendOptions[k].toggle === false) {
                    //Don't write anything to data
                    continue;
                } else {
                    //Write something to data
                    if (!data[legendData[k]]) {
                        data[legendData[k]] = [];
                    }
                    data[legendData[k]].push(parseFloat(lineData[i][legendData[k]]));
                }
            } else {
                //Initial creation of visualization w/o legend options
                if (!data[legendData[k]]) {
                    data[legendData[k]] = [];
                }
                if (data[legendData[k]].length < lineData.length) {
                    data[legendData[k]].push(parseFloat(lineData[i][legendData[k]]));
                }
            }
        }
    }

    chart.svg.selectAll(".lines").remove();

    chart.svg.selectAll(".line").remove();
    chart.svg.selectAll(".circle").remove();
    chart.svg.selectAll("#line-gradient").remove();

    lines = chart.svg.selectAll(".line-container");

    var valueline = {};
    var circles = {};
    var index = 0;
    var lineColors = [];
    var max;
    var min;
    var thresholding = false;
    for (var k in data) {
        //Create path generator for each series
        if (data.hasOwnProperty(k)) {
            valueline[k] = d3.line() //line drawing function
            .x(function (d, i) {
                if (isNaN(d)) {
                    return null;
                }
                return xTranslate(d, i);
            }).y(function (d, i) {
                if (isNaN(d)) {
                    return null;
                }
                return yTranslate(d, i);
            });

            //Add lines to the line-container
            lines.append('g').attr('class', 'line ' + k).append("path") //draws the line
            .attr('stroke', function (d, i, j) {
                var colorObj = jvCharts.getColors(colors, i, k);
                lineColors.push(colorObj);
                return colorObj;
            }) // fills the bar with color
            .attr("stroke-width", "2").attr("fill", "none").attr("d", valueline[k](data[k]));

            //Color Thresholding for each tier
            if (chart.options.thresholds != 'none' && chart.options.colorChart != false) {
                if (chart.options.colorLine) {
                    var thresholdPercents = [];
                    if (chart.options.rotateAxis) {
                        var zero = { percent: 0, color: lineColors[index] };
                        thresholdPercents.push(zero);

                        for (var z = 0; z < Object.keys(chart.options.thresholds).length; z++) {
                            var pCent = chart.options.thresholds[z].threshold * 100 / (xAxisData.max - xAxisData.min);
                            var temp = { percent: pCent, color: chart.options.thresholds[z].thresholdColor };
                            thresholdPercents.push(temp);
                        }
                    } else {
                        var zero = { percent: 0, color: lineColors[index] };
                        thresholdPercents.push(zero);

                        for (var z = 0; z < Object.keys(chart.options.thresholds).length; z++) {
                            var pCent = chart.options.thresholds[z].threshold * 100 / (yAxisData.max - yAxisData.min);
                            var temp = { percent: pCent, color: chart.options.thresholds[z].thresholdColor };
                            thresholdPercents.push(temp);
                        }
                    }

                    var thresholdData = chart.setLineThresholdData(chart, thresholdPercents, lineColors[index]);

                    lines.selectAll("path").attr("class", "line-threshold");

                    if (chart.options.rotateAxis) {
                        chart.svg.append("linearGradient").attr("id", "line-gradient").attr("gradientUnits", "userSpaceOnUse").attr("x1", xTranslate(xAxisData.min)).attr("y1", 0).attr("x2", xTranslate(xAxisData.max)).attr("y2", 0).selectAll("stop").data(thresholdData).enter().append("stop").attr("offset", function (d) {
                            return d.offset;
                        }).attr("stop-color", function (d) {
                            return d.color;
                        });
                    } else {
                        chart.svg.append("linearGradient").attr("id", "line-gradient").attr("gradientUnits", "userSpaceOnUse").attr("x1", 0).attr("y1", yTranslate(yAxisData.min)).attr("x2", 0).attr("y2", yTranslate(yAxisData.max)).selectAll("stop").data(thresholdData).enter().append("stop").attr("offset", function (d) {
                            return d.offset;
                        }).attr("stop-color", function (d) {
                            return d.color;
                        });
                    }
                }
                thresholding = true;
            }

            //Add circles at joints in the lines
            circles[k] = lines.append('g').attr('class', 'circle ' + k).selectAll('circle').data(data[k]).enter().append("circle") //Circles for the joints in the line
            .attr('class', function (d, i) {
                return 'circle-' + chart.currentData.chartData[i][chart.currentData.dataTable.label] + ' highlight-class-' + i;
            }).attr("cx", function (d, i) {
                if (isNaN(d)) {
                    return null;
                }
                return xTranslate(d, i);
            }).attr("cy", function (d, i) {
                if (isNaN(d)) {
                    return null;
                }
                return yTranslate(d, i);
            }).attr('fill', function (d, i, j) {
                if (isNaN(d)) {
                    return null;
                } else if (thresholding == true) {
                    var length = Object.keys(chart.options.thresholds).length - 1;
                    if (chart.options.rotateAxis) {
                        for (var z = length; z > -1; z--) {
                            var threshold = chart.options.thresholds[z];
                            if (d >= threshold.threshold) {
                                return threshold.thresholdColor;
                            }
                        }
                    } else {
                        for (var z = length; z > -1; z--) {
                            var threshold = chart.options.thresholds[z];
                            if (d >= threshold.threshold) {
                                return threshold.thresholdColor;
                            }
                        }
                    }
                }

                return jvCharts.getColors(colors, i, k);
            }).attr('opacity', function (d, i, j) {
                if (isNaN(d)) {
                    return 0;
                }
                return 1;
            }).attr("r", 2.5);

            index++;
        }
    }

    //Return line groups
    return lines.selectAll(".circle");
}

function setLineThresholdData(chart, thresholds, color) {
    var data = [];
    for (var k = 0; k < thresholds.length; k++) {
        var gradient;
        var gradientOne = { offset: thresholds[k].percent + "%", color: thresholds[k].color };
        data.push(gradientOne);

        if (k + 1 < thresholds.length) {
            var gradientTwo = { offset: thresholds[k + 1].percent + "%", color: thresholds[k].color };
            data.push(gradientTwo);
        }

        if (k == thresholds.length - 1) {
            var last = { offset: "100%", color: thresholds[k].color };
            data.push(last);
        }
    }

    return data;
}

module.exports = jvCharts;

},{"../jvCharts.js":3}],10:[function(require,module,exports){
'use strict';

var jvCharts = require('../jvCharts.js');

jvCharts.prototype.bar = {
    paint: paint,
    setData: setData
};

jvCharts.prototype.generateBarThreshold = generateBarThreshold;
jvCharts.prototype.generateBars = generateBars;

/**paint
 *
 * The initial starting point for bar chart, begins the drawing process. Must already have the data stored in the chart
 * object
 */
function paint(chart) {
    //Uses the original data and then manipulates it based on any existing options
    var dataObj = chart.getBarDataFromOptions();

    //assign current data which is used by all bar chart operations
    chart.currentData = dataObj;

    //generate svg dynamically based on legend data
    chart.generateSVG(dataObj.legendData);
    chart.generateXAxis(dataObj.xAxisData);
    chart.generateYAxis(dataObj.yAxisData);
    chart.generateLegend(dataObj.legendData, 'generateBars');
    chart.generateBars(dataObj);

    if (typeof dataObj.xAxisScale.ticks === "function") {
        chart.formatXAxisLabels(dataObj.xAxisScale.ticks().length);
    } else {
        chart.formatXAxisLabels(dataObj.xAxisScale.domain().length);
    }
}

/**Sets the data for the bar chart prior to painting
 *  @function
 * @params {Object} data - Data passed into the chart
 * @params {Object} dataTable - Shows which data column is associated with each field in visual panel
 * @params {Object} dataTableKeys - Contains the data type for each column of data
 * @params {Object} colors - Colors object used to color the bars
 */
function setData(chart) {
    //sort chart data if there is a sort type and label in the options
    if (chart.options.hasOwnProperty('sortType') && chart.options.sortType) {
        if (chart.options.sortLabel && chart.options.sortType !== 'default') {
            chart.organizeChartData(chart.options.sortLabel, chart.options.sortType);
        }
    }
    chart.data.legendData = setBarLineLegendData(chart.data);
    chart.data.xAxisData = chart.setAxisData('x', chart.data);
    chart.data.yAxisData = chart.setAxisData('y', chart.data);
    if (chart.options.seriesFlipped) {
        chart.setFlippedSeries(chart.data.dataTableKeys);
        chart.flippedData.color = jvCharts.setChartColors(chart.options.color, chart.flippedData.legendData, chart.colors);
    }

    //define color object for chartData
    chart.data.color = jvCharts.setChartColors(chart.options.color, chart.data.legendData, chart.colors);
}

/**setBarLineLegendData
 *  gets legend info from chart Data
 *
 * @params data, type
 * @returns [] of legend text
 */
function setBarLineLegendData(data) {
    var legendArray = [];
    for (var item in data.dataTable) {
        if (data.dataTable.hasOwnProperty(item)) {
            if (item !== 'label') {
                legendArray.push(data.dataTable[item]);
            }
        }
    }
    return legendArray;
}

/************************************************ Bar functions ******************************************************/
function generateBarThreshold() {
    var chart = this,
        svg = chart.svg,
        type = chart.config.type,
        width = chart.config.container.width,
        height = chart.config.container.height,
        thresholds = chart.options.thresholds,
        length = thresholds ? Object.keys(thresholds).length : 0;

    var x = chart.currentData.xAxisScale;
    var y = chart.currentData.yAxisScale;

    if (thresholds !== 'none') {
        for (var i = 0; i < length; i++) {
            var threshold = thresholds[i];
            if (!chart.options.xAxisThreshold) {
                if (chart.options.rotateAxis) {
                    svg.append('line').style('stroke', threshold.thresholdColor).attr('x1', x(threshold.threshold)).attr('y1', 0).attr('x2', x(threshold.threshold)).attr('y2', height).attr('stroke-dasharray', '3, 3');
                } else {
                    svg.append('line').style('stroke', threshold.thresholdColor).attr('x1', 0).attr('y1', y(threshold.threshold)).attr('x2', width).attr('y2', y(threshold.threshold)).attr('stroke-dasharray', '3, 3');
                }
            }

            if (chart.options.colorChart == true) {
                var thresholdRects = d3.selectAll('rect.rect-' + i);
                thresholdRects.attr('fill', threshold.thresholdColor);
            }
        }
    }
}

/**generateBars
 *
 * Does the actual painting of bars on the bar chart
 * @params barData
 */

function generateBars(barData) {
    var chart = this,
        offset,
        svg = chart.svg,
        options = chart.options,
        container = chart.config.container;

    //Used to draw line that appears when tool tips are visible
    var tipLineX = 0,
        tipLineWidth = 0,
        tipLineHeight = 0,
        tipLineY = 0;

    //Removes any existing bar containers and creates a new one
    svg.selectAll('g.bar-container').remove();
    var bars = svg.append('g').attr('class', 'bar-container').selectAll('g');

    //Add logic to filter bardata
    var dataHeaders = chart.options.seriesFlipped ? chart.options.flippedLegendHeaders ? chart.options.flippedLegendHeaders : barData.legendData : chart.options.legendHeaders ? chart.options.legendHeaders : barData.legendData;

    var barDataNew = jvCharts.getToggledData(barData, dataHeaders);

    var barGroups = generateBarGroups(bars, barDataNew, chart);
    var eventGroups = jvCharts.generateEventGroups(bars, barDataNew, chart);

    //Add listeners

    eventGroups.on('mouseover', function (d, i, j) {
        //Transitions in D3 don't support the 'on' function They only exist on selections. So need to move that event listener above transition and after append
        if (chart.draw.showToolTip) {
            //Get tip data
            var tipData = chart.setTipData(d, i);

            //Draw tip line
            chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);

            svg.selectAll('.tip-line').remove();

            var mouseItem = d3.select(this);
            tipLineX = mouseItem.node().getBBox().x;
            tipLineWidth = mouseItem.node().getBBox().width;
            tipLineHeight = mouseItem.node().getBBox().height;
            tipLineY = mouseItem.node().getBBox().y;

            //Draw line in center of event-rect
            svg.append('line').attr('class', 'tip-line').attr('x1', function () {
                return options.rotateAxis ? 0 : tipLineX + tipLineWidth / 2;
            }).attr('x2', function () {
                return options.rotateAxis ? tipLineWidth : tipLineX + tipLineWidth / 2;
            }).attr('y1', function () {
                return options.rotateAxis ? tipLineY + tipLineHeight / 2 : 0;
            }).attr('y2', function () {
                return options.rotateAxis ? tipLineY + tipLineHeight / 2 : tipLineHeight;
            }).attr('fill', 'none').attr('shape-rendering', 'crispEdges').attr('stroke', 'black').attr('stroke-width', '1px');
        }
    }).on('mousemove', function (d, i) {
        if (chart.draw.showToolTip) {
            chart.tip.hideTip();
            //Get tip data
            var tipData = chart.setTipData(d, i);
            //Draw tip line
            chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
        }
    }).on('mouseout', function (d) {
        if (chart.draw.showToolTip) {
            chart.tip.hideTip();
            svg.selectAll('line.tip-line').remove();
        }
    });

    chart.displayValues();
    chart.generateClipPath();
    chart.generateBarThreshold();
}

/**generateBarGroups
 *
 * Paints the groups of the bars
 * @params chartContainer, barData, chart
 */
function generateBarGroups(chartContainer, barData, chart) {
    var container = chart.config.container,
        options = chart.options,
        xAxisData = chart.currentData.xAxisData,
        yAxisData = chart.currentData.yAxisData,
        colors = options.color;

    var x = jvCharts.getAxisScale('x', xAxisData, container, null, options);
    var y = jvCharts.getAxisScale('y', yAxisData, container, null, options);

    var posCalc = jvCharts.getPosCalculations(barData, options, xAxisData, yAxisData, container, chart);

    var dataToPlot = jvCharts.getPlotData(barData, chart);

    var barGroups;
    if (xAxisData.dataType === 'STRING' || !xAxisData.hasOwnProperty('min')) {
        //Creates bar groups
        barGroups = chartContainer.data(dataToPlot).enter().append('g').attr('class', 'bar-group').attr('transform', function (d, i) {
            //Translate the bar groups by (outer padding * step) and the width of the bars (container.width / barData.length * i)
            return 'translate(' + (x.paddingOuter() * x.step() + x.step() * i) + ',0)';
        });
    } else if (xAxisData.dataType === 'NUMBER') {
        //Creates bar groups
        barGroups = chartContainer.data(dataToPlot).enter().append('g').attr('class', 'bar-group').attr('transform', function (d, i) {
            //Translate the bar groups by (outer padding * step) and the width of the bars (container.width / barData.length * i)
            return 'translate(0,' + (y.paddingOuter() * y.step() + y.step() * i) + ')';
        });
    }

    //Creates bars within bar groups
    var externalCounterForJ = -1;
    var bars = barGroups.selectAll('rect').data(function (d) {
        return d;
    }).enter().append('rect').attr('class', function (d, i, j) {
        if (i === 0) {
            externalCounterForJ++;
        }
        var label = String(barData[externalCounterForJ][chart.currentData.dataTable.label]).replace(/\s/g, '_').replace(/\./g, '<dot>'),
            legendVal = String(chart.currentData.legendData[i]).replace(/\s/g, '_').replace(/\./g, '<dot>');

        var xAxisValue = barData[externalCounterForJ][chart.currentData.dataTable.label];
        if (chart.options.xAxisThreshold) {
            var thresholdDir = chart.setThreshold(xAxisValue);
        } else {
            var thresholdDir = chart.setThreshold(d);
        }

        return 'editable editable-bar bar-col-' + label + '-index-' + legendVal + ' highlight-class-' + label + ' rect ' + thresholdDir;
    }).attr('x', function (d, i, j) {
        return posCalc.startx(d, i);
    }).attr('y', function (d, i) {
        return posCalc.starty(d, i);
    }).attr('width', function (d, i) {
        return posCalc.startwidth(d, i);
    }).attr('height', function (d, i, j) {
        return posCalc.startheight(d, i);
    }).attr('fill', function (d, i) {
        if (chart.options.seriesFlipped) {
            var color = jvCharts.getColors(colors, i, chart.options.flippedLegendHeaders[i]);
        } else {
            var color = jvCharts.getColors(colors, i, chart.options.legendHeaders[i]);
        }
        return color;
    }).attr('rx', 0).attr('ry', 0).attr('opacity', 0.9).attr('clip-path', function (d) {
        if (d > 30000000) {
            return 'url(#clip-above)';
        }
        return 'url(#clip-below)';
    });

    bars.transition().duration(800).ease(d3.easePolyOut).attr('x', function (d, i, j) {
        return posCalc.x(d, i, j);
    }).attr('y', function (d, i, j) {
        return posCalc.y(d, i, j);
    }).attr('width', function (d, i, j) {
        return posCalc.width(d, i);
    }).attr('height', function (d, i, j) {
        return posCalc.height(d, i);
    });

    return barGroups; //returns the bar containers
}

module.exports = jvCharts;

},{"../jvCharts.js":3}],11:[function(require,module,exports){
'use strict';

var jvCharts = require('../jvCharts.js');

jvCharts.prototype.gantt = {
    paint: paint,
    setData: setData
};

jvCharts.prototype.generateGanttBars = generateGanttBars;
jvCharts.prototype.setGanttLegendData = setGanttLegendData;
jvCharts.prototype.setGanttAxisData = setGanttAxisData;

/************************************************ Gantt functions ******************************************************/

/**
*
* @param data
* @param dataTable
* @param colors
*/
function setData(chart) {
    chart.data.legendData = chart.setGanttLegendData(chart.data);
    chart.data.xAxisData = chart.setGanttAxisData(chart, 'x');
    chart.data.yAxisData = chart.setGanttAxisData(chart, 'y');
    //define color object for chartData
    chart.data.color = jvCharts.setChartColors(chart.options.color, chart.data.legendData, chart.colors);
}

function setGanttLegendData(data) {
    var legendArray = [];
    for (var i = 1; i <= Object.keys(data.dataTable).length; i++) {
        if (data.dataTable.hasOwnProperty(["start " + i])) {
            //check to make sure it has a matching end date
            if (data.dataTable.hasOwnProperty(["end " + i])) {
                legendArray.push(data.dataTable["start " + i]);
            }
        }
    }
    return legendArray;
}

function setGanttAxisData(chart, axis) {
    var axisData = [],
        data = chart.data,
        chartData = data.chartData,
        dataType;

    if (axis === 'x') {
        var label = data.dataTable.group;
        dataType = 'DATE';

        var numBars = data.legendData.length;
        //Loop through dataTable and assign labels based on how many groups there are
        var valueContainer = [];
        valueContainer.push(data.dataTable["start 1"]);
        valueContainer.push(data.dataTable["end 1"]);
        for (var i = 1; i < numBars; i++) {
            valueContainer.push(data.dataTable["start " + (i + 1)]);
            valueContainer.push(data.dataTable["end " + (i + 1)]);
        }

        //Get all the start and end dates and add them to axis data
        for (var i = 0; i < valueContainer.length; i++) {
            for (var ii = 0; ii < chartData.length; ii++) {
                if (chartData[ii][valueContainer[i]] != null) {
                    axisData.push(chartData[ii][valueContainer[i]]);
                }
            }
        }

        //Add any axis formatting to this object, need to use when painting
        chart.options.xAxisFormatting = {};
    } else {
        dataType = "STRING";
        var label = data.dataTable.group;

        //Add any axis formatting to this object, need to use when painting
        chart.options.yAxisFormatting = {};

        for (var i = 0; i < chartData.length; i++) {
            axisData.push(chartData[i][label]);
        }
    }

    return {
        'label': label,
        'values': axisData,
        'dataType': dataType
    };
}

function paint(chart) {
    chart.options.color = chart.data.color;

    chart.currentData = chart.data;

    chart.generateSVG(chart.currentData.legendData);
    chart.generateXAxis(chart.currentData.xAxisData);
    chart.generateYAxis(chart.currentData.yAxisData);
    chart.generateLegend(chart.currentData.legendData, 'generateGanttBars');
    chart.drawGridlines(chart.currentData.xAxisData);
    chart.generateGanttBars(chart.currentData);
    if (typeof chart.currentData.xAxisScale.ticks === "function") {
        chart.formatXAxisLabels(chart.currentData.xAxisScale.ticks().length);
    } else {
        chart.formatXAxisLabels(chart.currentData.xAxisScale.domain().length);
    }
}

function generateGanttBars(ganttData) {
    var chart = this,
        svg = chart.svg,
        colors = ganttData.color,
        options = chart.options,
        container = chart.config.container,
        yAxisData = ganttData.yAxisData;

    //Remove existing bars from page
    svg.selectAll("g.bar-container").remove();
    var bars = svg.append("g").attr("class", "bar-container"),
        dataHeaders = chart.options.legendHeaders ? chart.options.legendHeaders : ganttData.legendData,
        ganttDataNew = jvCharts.getToggledData(ganttData, dataHeaders),
        x = jvCharts.getAxisScale('x', ganttData.xAxisData, container, null, null),
        y = jvCharts.getAxisScale('y', ganttData.yAxisData, container, null, null),
        sampleData = ganttDataNew;

    options.rotateAxis = true;

    //Create num bars variable and loop through to draw bars based on how many groups there are
    //var keys = Object.keys(ganttData.dataTable);
    //var count = 0;
    //for (var i = 0; i < keys.length; i++) {
    //    if (ganttData.dataTable[keys[i]] != null && ganttData.dataTable[keys[i]] != "") {
    //        count++;
    //    }
    //}
    //var numBars = Math.floor((count - 1) / 2);
    var numBars = ganttData.legendData.length;
    var ganttBars = [];

    //create array of start dates and end dates to iterate through
    var startDates = [];
    var endDates = [];
    for (var i = 1; i <= numBars; i++) {
        startDates.push(chart.currentData.dataTable["start " + i]);
        endDates.push(chart.currentData.dataTable["end " + i]);
    }

    for (var ii = 0; ii < numBars; ii++) {
        ganttBars[ii] = bars.selectAll(".gantt-bar" + ii).data(sampleData).enter().append("rect").attr("class", "gantt-bar" + ii).attr("width", function (d, i) {
            return 0;
        }).attr("height", function (d, i) {
            return y.bandwidth() / numBars;
        }).attr("x", function (d, i) {
            if (d[startDates[ii]]) {
                return x(new Date(d[startDates[ii]]));
            } else {
                return 0;
            }
        }).attr("y", function (d, i) {
            return y(d[yAxisData.label]) + y.bandwidth() / numBars * ii;
        }).attr("rx", 3).attr("ry", 3).attr("fill", function (d, i, j) {
            var typeVal = chart.currentData.dataTable["Type" + (ii + 1)];
            if (chart.options.legendHeaders) {
                var color = jvCharts.getColors(colors, 0, chart.options.legendHeaders[ii]);
            } else {
                var color = jvCharts.getColors(colors, 0, chart.currentData.legendData[ii]);
            }
            return color;
        });

        ganttBars[ii].transition().duration(400).delay(100).attr("width", function (d, i) {
            var width = x(new Date(d[endDates[ii]])) - x(new Date(d[startDates[ii]])); //(x(d.StartDate) - x(d.EndDate));
            if (width >= 0) {
                return width;
            } else {
                return 0;
            }
        });
    }

    var dataToPlot = jvCharts.getPlotData(ganttDataNew, chart);
    var eventGroups = bars.selectAll(".event-rect").data(dataToPlot).enter().append('rect').attr("class", "event-rect").attr("x", 0).attr("y", function (d, i) {
        return container.height / ganttDataNew.length * i;
    }).attr("width", container.width).attr("height", function (d, i) {
        return container.height / ganttDataNew.length;
    }).attr("fill", "transparent").attr("transform", "translate(0,0)");
    eventGroups.on("mouseover", function (d, i, j) {
        // Transitions in D3 don't support the 'on' function They only exist on selections. So need to move that event listener above transition and after append
        if (chart.draw.showToolTip) {
            //Get tip data
            var tipData = chart.setTipData(d, i);
            //Draw tip
            chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
        }
    }).on("mousemove", function (d, i) {
        if (chart.draw.showToolTip) {
            chart.tip.hideTip();
            //Get tip data
            var tipData = chart.setTipData(d, i);
            //Draw tip line
            chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
        }
    }).on("mouseout", function (d) {
        if (chart.draw.showToolTip) {
            chart.tip.hideTip();
        }
    });

    var currentDate = new Date();
    var dateData = [currentDate];
    //Draws a line representing the current date
    svg.selectAll(".currentDateLine").data(dateData).enter().append("line").attr("x1", function (d, i) {
        return x(d);
    }).attr("x2", function (d, i) {
        return x(d);
    }).attr("y1", function (d, i) {
        return "0px";
    }).attr("y2", function (d, i) {
        return chart.config.container.height;
    }).attr("class", "currentDateLine").attr("stroke", "black").attr("stroke-width", "2px").attr("stroke-dasharray", "3, 3");

    svg.selectAll(".currentDateLabel").data(dateData).enter().append("text").text(function () {
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth() + 1; //January is 0!

        var yyyy = today.getFullYear();
        if (dd < 10) {
            dd = '0' + dd;
        }
        if (mm < 10) {
            mm = '0' + mm;
        }
        var today = mm + '/' + dd + '/' + yyyy;
        return today;
    }).attr("x", function (d, i) {
        return x(d);
    }).attr("y", function (d, i) {
        return "-10px";
    }).attr("text-anchor", "middle");
}

module.exports = jvCharts;

},{"../jvCharts.js":3}],12:[function(require,module,exports){
'use strict';

var jvCharts = require('../jvCharts.js');

jvCharts.prototype.heatmap = {
    paint: paint,
    setData: setData
};

jvCharts.prototype.generateHeatMap = generateHeatMap;

/************************************************ HeatMap functions ******************************************************/

/**setHeatMapData
 *  gets heatmap data and adds it to the chart object
 *
 * @params data, dataTable, colors
 */
function setData(chart) {
    var axisNames = setHeatAxisNames(chart.data);
    chart.data.xAxisData = axisNames.xAxisData;
    chart.data.yAxisData = axisNames.yAxisData;
    chart.data.processedData = setProcessedData(chart.data, chart.data.xAxisData.values, chart.data.yAxisData.values);
    //define color object for chartData
    chart.options.color = jvCharts.setChartColors(chart.options.color, chart.data.xAxisData.values, chart.colors);
    chart.data.heatData = setHeatmapLegendData(chart, chart.data);
}

function setHeatmapLegendData(chart, data) {
    var heatData;
    var bucketMapper = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var bucketCount;
    chart.options.colors = organizeColors(chart);
    chart.data.colorScale = d3.scaleQuantile().domain(data.heatScores).range(chart.options.colors);

    if (chart.options.quantiles === true) {
        heatData = [0].concat(chart.data.colorScale.quantiles());
    } else {
        bucketCount = bucketMapper[chart.options.buckets - 1];
        heatData = quantized(data.heatScores[0], data.heatScores[data.heatScores.length - 1]);
    }

    return heatData;
}

function organizeColors(chart) {
    var colorSelectedBucket = [];
    for (var c in chart.options.colors) {
        colorSelectedBucket.push(chart.options.colors[c]);
    }

    var sValue = chart.options.buckets;
    var newColors = [];
    var bucketMapper = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var bucketCount = bucketMapper[sValue - 1];
    for (var i = 0; i < bucketCount; i++) {
        if (i >= bucketCount / 2) {
            newColors[i] = colorSelectedBucket[Math.round((i + 1) / bucketCount * 20) - 1];
        } else {
            newColors[i] = colorSelectedBucket[Math.round(i / bucketCount * 20)];
        }
    }
    var colors = newColors.slice(0);
    return colors;
}

function setHeatAxisNames(data) {
    var chartData = data.chartData;
    var xAxisName = data.dataTable.x;
    var yAxisName = data.dataTable.y;
    var xAxisArray = [];
    var yAxisArray = [];
    var returnObj = {};
    for (var i = 0; i < data.dataTableKeys.length; i++) {
        if (data.dataTableKeys[i].vizType === 'x') {
            returnObj.xAxisData = {};
            returnObj.xAxisData.dataType = data.dataTableKeys[i].type;
            returnObj.xAxisData.label = data.dataTable.x;
        }
        if (data.dataTableKeys[i].vizType === 'y') {
            returnObj.yAxisData = {};
            returnObj.yAxisData.dataType = data.dataTableKeys[i].type;
            returnObj.yAxisData.label = data.dataTable.y;
        }
    }

    for (var i = 0; i < chartData.length; i++) {
        if (xAxisArray.indexOf(chartData[i][xAxisName]) === -1) {
            xAxisArray.push(chartData[i][xAxisName]);
            //TODO make into 1 function for min max... waste of space
            if (returnObj.xAxisData.dataType === 'NUMBER') {
                //push min and max info
                if (!returnObj.xAxisData.min) {
                    returnObj.xAxisData.min = chartData[i][xAxisName];
                } else if (chartData[i][xAxisName] < returnObj.xAxisData.min) {
                    returnObj.xAxisData.min = chartData[i][xAxisName];
                }

                if (!returnObj.xAxisData.max) {
                    returnObj.xAxisData.max = chartData[i][xAxisName];
                } else if (chartData[i][xAxisName] < returnObj.xAxisData.max) {
                    returnObj.xAxisData.max = chartData[i][xAxisName];
                }
            }
        }
        if (yAxisArray.indexOf(chartData[i][yAxisName]) === -1) {
            yAxisArray.push(chartData[i][yAxisName]);
            if (returnObj.yAxisData.dataType === 'NUMBER') {
                //push min and max info
                if (!returnObj.yAxisData.min) {
                    returnObj.yAxisData.min = chartData[i][yAxisName];
                } else if (chartData[i][yAxisName] < returnObj.yAxisData.min) {
                    returnObj.yAxisData.min = chartData[i][yAxisName];
                }

                if (!returnObj.yAxisData.max) {
                    returnObj.yAxisData.max = chartData[i][yAxisName];
                } else if (chartData[i][yAxisName] < returnObj.yAxisData.max) {
                    returnObj.yAxisData.max = chartData[i][yAxisName];
                }
            }
        }
    }
    returnObj.xAxisData.values = xAxisArray;
    returnObj.yAxisData.values = yAxisArray;

    return returnObj;
}

function setProcessedData(data, xAxisArray, yAxisArray) {
    var chartData = data.chartData;
    var xAxisName = data.dataTable.x;
    var yAxisName = data.dataTable.y;
    var heat = data.dataTable.heat;
    var dataArray = [];
    data.heatScores = [];
    /*Assign each name a number and place matrix coordinates inside of dataArray */
    for (var i = 0; i < chartData.length; i++) {
        dataArray.push({
            value: chartData[i][heat],
            xAxisName: chartData[i][xAxisName],
            yAxisName: chartData[i][yAxisName]
        });
        //This array stores the values as numbers
        data.heatScores.push(chartData[i][heat]);
        for (var j = 0; j < xAxisArray.length; j++) {
            if (xAxisArray[j] === dataArray[i].xAxisName) {
                dataArray[i].xAxis = j;
                break;
            }
        }
        for (var j = 0; j < yAxisArray.length; j++) {
            if (yAxisArray[j] === dataArray[i].yAxisName) {
                dataArray[i].yAxis = j;
                break;
            }
        }
    }
    return dataArray;
}

function paint(chart) {
    chart.options.color = chart.data.color;
    chart.currentData = chart.data; //Might have to move into method bc of reference/value relationship
    var customMargin = {
        top: 0,
        right: 40,
        left: 0,
        bottom: 20
    };
    //Generate SVG-legend data is used to determine the size of the bottom margin (set to null for no legend)
    chart.generateSVG(null, customMargin);
    //chart.generateLegend(chart.currentData.legendData, 'generateHeatMap');
    chart.generateHeatMap();
}

/**generateHeatMap
 *
 * paints the HeatMap on the chart
 * @params HeatMapData
 */
function generateHeatMap() {
    var chart = this,
        svg = chart.svg,
        colors = chart.options.colors,
        container = chart.config.container,
        minContainer = 300,
        quantiles = chart.options.quantiles,
        data = chart.data.processedData,
        toggleLegend = !chart.options.toggleLegend,
        scaleByMinCategory,
        scaleByContainer,
        heatMapData = chart.currentData;

    if (heatMapData.xAxisData.values.length > heatMapData.yAxisData.values.length) {
        scaleByMinCategory = heatMapData.xAxisData.values.length;
    } else {
        scaleByMinCategory = heatMapData.yAxisData.values.length;
    }

    if (container.width < minContainer || container.height < minContainer) {
        scaleByContainer = minContainer;
    }
    //else if(container.width > maxContainer && container.height > maxContainer){
    //scaleByContainer = maxContainer;
    //}
    else if (container.height > container.width) {
            scaleByContainer = container.width;
        } else {
            scaleByContainer = container.height;
        }

    var div = d3.select('body').append('div').attr('class', 'tooltip').style('opacity', 0);

    var gridSize = Math.floor(scaleByContainer / scaleByMinCategory);

    //Remove Scaling for right now
    //if (gridSize < 15) {
    //gridSize = 15;
    //} else if (gridSize > 115) {

    //}
    gridSize = 20;

    var vis = svg.append('g').attr('transform', 'translate(0,0)').attr('class', 'heatmap');

    var yAxisTitle = vis.selectAll('.heatmap').data([heatMapData.dataTable.y]);

    yAxisTitle.enter().append('text').attr('class', 'axisLabels bold').attr('x', -21).attr('y', -5).attr('text-anchor', 'end').text(function (d) {
        return d;
    });

    yAxisTitle.exit().remove();
    var formatType = jvCharts.jvFormatValueType(chart.currentData.yAxisData.values);

    var yAxis = vis.selectAll('.yAxis').data(heatMapData.yAxisData.values).enter().append('text').text(function (d) {
        return jvCharts.jvFormatValue(d, formatType);
    }).attr('x', 0).attr('y', function (d, i) {
        return i * gridSize;
    }).style('text-anchor', 'end').style('font-size', chart.options.fontSize).attr('transform', 'translate(-6,' + gridSize / 1.5 + ')').attr('class', function (d, i) {
        return 'rowLabel pointer';
    }).on('click', function (d) {
        //removing styling
        d3.selectAll('.rowLabel').classed('text-highlight', false);
        d3.selectAll('.colLabel').classed('text-highlight', false);
        d3.selectAll('.heat').classed('rect-highlight', false);
        d3.selectAll('.heat').classed('rect-border', false);
    }).on('click', function (d) {
        console.log(d);
        //fade all rects except in this row
        d3.selectAll('.heat').classed('rect-highlight', function (r, ri) {
            for (var i = 0; i < chart.currentData.yAxisData.values.length; i++) {
                if (chart.currentData.yAxisData.values[i] === d && d) {
                    if (r.yAxis != i) {
                        return true;
                    }
                }
            }
        });
    });

    var xAxisTitle = vis.selectAll('.xAxisTitle').data([heatMapData.dataTable.x]);

    xAxisTitle.enter().append('text').attr('class', 'axisLabels bold').attr('x', 6).attr('y', 9).attr('transform', function (d, i) {
        return 'translate(' + -gridSize + ', -20)rotate(-45)';
    }).text(function (d) {
        return d;
    });

    xAxisTitle.exit().remove();

    var xAxis = vis.selectAll('.xAxis').data(heatMapData.xAxisData.values).enter().append('svg:g');

    formatType = jvCharts.jvFormatValueType(chart.currentData.xAxisData.values);

    xAxis.append('text').text(function (d) {
        return jvCharts.jvFormatValue(d, formatType);
    }).style('text-anchor', 'start').attr('x', 6).attr('y', 7).attr('class', function (d, i) {
        return 'colLabel pointer';
    }).attr('transform', function (d, i) {
        return 'translate(' + i * gridSize + ', -6)rotate(-45)';
    }).style('font-size', chart.options.fontSize).on('click', function (d) {
        //removing styling
        d3.selectAll('.rowLabel').classed('text-highlight', false);
        d3.selectAll('.colLabel').classed('text-highlight', false);
        d3.selectAll('.heat').classed('rect-highlight', false);
        d3.selectAll('.heat').classed('rect-border', false);
    }).on('click', function (d) {
        //fade all rects except in this column
        d3.selectAll('.heat').classed('rect-highlight', function (r, ri) {
            for (var i = 0; i < chart.currentData.xAxisData.values.length; i++) {
                if (chart.currentData.xAxisData.values[i] === d) {
                    if (r.xAxis !== i) {
                        return true;
                    }
                }
            }
        });
    });

    var width = heatMapData.xAxisData.values.length * gridSize;
    var height = heatMapData.yAxisData.values.length * gridSize;
    var formatValueType = jvCharts.jvFormatValueType(chart.data.heatData);

    //vertical lines
    var vLine = vis.selectAll('.vline').data(d3.range(heatMapData.xAxisData.values.length + 1)).enter().append('line').attr('x1', function (d) {
        return d * gridSize;
    }).attr('x2', function (d) {
        return d * gridSize;
    }).attr('y1', function (d) {
        return 0;
    }).attr('y2', function (d) {
        return height;
    }).style('stroke', '#eee');

    //horizontal lines
    var hLine = vis.selectAll('.hline').data(d3.range(heatMapData.yAxisData.values.length + 1)).enter().append('line').attr('y1', function (d) {
        return d * gridSize;
    }).attr('y2', function (d) {
        return d * gridSize;
    }).attr('x1', function (d) {
        return 0;
    }).attr('x2', function (d) {
        return width;
    }).style('stroke', '#eee');

    var heatMap = vis.selectAll('.heat').data(data).enter().append('rect').attr('x', function (d) {
        return d.xAxis * gridSize;
    }).attr('y', function (d) {
        return d.yAxis * gridSize;
    }).attr('rx', 2).attr('ry', 2).attr('class', 'heat').attr('width', gridSize - 1).attr('height', gridSize - 1).style('fill', function (d) {
        if (quantiles === true) {
            if (chart.options.domainArray.length === 0 || d.value >= chart.options.domainArray[0] && d.value <= chart.options.domainArray[1]) {
                return chart.data.colorScale(d.value);
            }
            return 'white';
        }
        var quantizedArray = quantized(heatMapData.heatScores[0], heatMapData.heatScores[heatMapData.heatScores.length - 1]);
        if (chart.options.domainArray.length == 0 || d.value >= chart.options.domainArray[0] && d.value <= chart.options.domainArray[1]) {
            return getQuantizedColor(quantizedArray, d.value);
        }
        return 'white';
    }).on('mouseover', function (d, i) {
        //Get tip data
        var tipData = chart.setTipData(d, i);
        tipData.color = chart.data.colorScale(d.value);

        //Draw tip
        chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
    }).on('mouseout', function (d) {
        chart.tip.hideTip();
    }).on('click', function (d) {
        //removing styling
        d3.selectAll('.rowLabel').classed('text-highlight', false);
        d3.selectAll('.colLabel').classed('text-highlight', false);
        d3.selectAll('.heat').classed('rect-highlight', false);
        d3.selectAll('.heat').classed('rect-border', false);
    }).on('dblclick', function (d) {
        //border around selected rect
        d3.select(this).classed('rect-border', true);

        //Fade row labels
        d3.selectAll('.rowLabel').classed('text-highlight', function (r, ri) {
            if (!(ri == d.yAxis)) {
                return true;
            }
        });

        //fade column labels
        d3.selectAll('.colLabel').classed('text-highlight', function (r, ri) {
            if (!(ri == d.xAxis)) {
                return true;
            }
        });

        //fade all rects except selected
        d3.selectAll('.heat').classed('rect-highlight', function (r, ri) {
            if (r.yAxis != d.yAxis || r.xAxis != d.xAxis) {
                return true;
            }
        });
    });

    chart.chartDiv.select("svg.heatLegend").remove();

    if (toggleLegend) {
        var legendContainer = chart.chartDiv.append('svg').style('top', chart.config.margin.top + 'px').style('background', chart.options.backgroundColor).attr('class', 'heatLegend').attr('width', chart.config.heatWidth);

        var legendTranslation = { x: 0, y: 15 },
            legendRectSize = gridSize,
            legendSpacing = 2,
            legendElementWidth = 20;

        if (gridSize > 20) {
            legendRectSize = 20;
        }

        var legend = legendContainer.selectAll('.legend').data(chart.data.heatData).enter().append('g').attr('transform', function (d, i) {
            var height = legendRectSize + legendSpacing;
            var offset = height * chart.data.colorScale.domain().length / 2;
            var horz = -2 * legendRectSize;
            var vert = i * height - offset;
            return 'translate(' + 0 + ',' + legendRectSize * i + ')';
        });

        legend.append('rect').attr('class', 'legend').attr('width', legendRectSize).attr('height', legendRectSize).style('fill', function (d, i) {
            return colors[i];
        }).on('click', function (d) {
            //removing styling
            d3.selectAll('.heat').classed('rect-highlight', false);
        }).on('dblclick', function (d) {
            //removing styling
            //fade all rects except selected
            d3.selectAll('.heat').classed('rect-highlight', function (r, ri) {
                if (r.value < d) {
                    return true;
                }
            });
        });

        legend.append('text').attr('class', 'legendText').attr('x', legendRectSize + legendSpacing).attr('y', legendRectSize - legendSpacing).text(function (d) {
            if (isNaN(d)) {
                return d;
            }
            return chart.jvFormatValue(d, formatValueType);
        }).style('fill', 'black');
    }

    function quantized(min, max) {
        bucketCount = chart.options.buckets;
        var sectionValue = (max - min) / bucketCount;
        var quantizedArray = [];
        for (var i = 0; i < bucketCount; i++) {
            quantizedArray[i] = min + i * sectionValue;
        }
        return quantizedArray;
    }

    function getQuantizedColor(quantizedArray, value) {
        for (var i = 1; i < quantizedArray.length; i++) {
            if (value < quantizedArray[i]) {
                return colors[i - 1];
            }
        }
        return colors[quantizedArray.length - 1];
    }
}

module.exports = jvCharts;

},{"../jvCharts.js":3}],13:[function(require,module,exports){
'use strict';

var jvCharts = require('../jvCharts.js');

jvCharts.prototype.line = {
    paint: paint,
    setData: setData
};

jvCharts.prototype.generateLine = generateLine;
jvCharts.prototype.setLineThresholdData = setLineThresholdData;

/************************************************ Line functions ******************************************************/

/**setLineData
 *  gets line data and adds it to the chart object
 *
 * @params data, dataTable, colors
 */
function setData(chart) {

    //sort chart data if there is a sort type and label in the options
    if (chart.options.sortType) {
        if (chart.options.sortLabel && chart.options.sortType !== 'default') {
            chart.organizeChartData(chart.options.sortLabel, chart.options.sortType, dataTableKeys);
        }
    }
    chart.data.legendData = setBarLineLegendData(chart.data);
    chart.data.xAxisData = chart.setAxisData('x', chart.data);
    chart.data.yAxisData = chart.setAxisData('y', chart.data);

    //define color object for chartData
    chart.data.color = jvCharts.setChartColors(chart.options.color, chart.data.legendData, chart.colors);
};
/**setBarLineLegendData
 *  gets legend info from chart Data
 *
 * @params data, type
 * @returns [] of legend tex
 */
function setBarLineLegendData(data) {
    var legendArray = [];
    for (var item in data.dataTable) {
        if (data.dataTable.hasOwnProperty(item)) {
            if (item !== 'label') {
                legendArray.push(data.dataTable[item]);
            }
        }
    }
    return legendArray;
}
/** paintLineChart
 *
 * The initial starting point for line chart, begins the drawing process. Must already have the data stored in the chart
 * object
 */
function paint(chart) {
    //Uses the original data and then manipulates it based on any existing options
    var dataObj = chart.getBarDataFromOptions();

    //assign current data which is used by all bar chart operations
    chart.currentData = dataObj;

    //generate svg dynamically based on legend data
    chart.generateSVG(dataObj.legendData);
    chart.generateXAxis(dataObj.xAxisData);
    chart.generateYAxis(dataObj.yAxisData);
    chart.generateLegend(dataObj.legendData, 'generateLine');
    if (chart.options.rotateAxis) {
        chart.formatXAxisLabels(dataObj.xAxisScale.ticks().length);
    } else {
        chart.formatXAxisLabels(dataObj.xAxisScale.domain().length);
    }

    chart.generateLine(dataObj);
};

/**
 * The initial starting point for the area chart. Similar to line chart logic with the addition of a fill area function.
 */
function paintAreaChart() {
    var chart = this;
    chart.paintLineChart();
}

/**
 *
 */
function fillArea(lineData) {

    var chart = this,
        svg = chart.svg,
        options = chart.options,
        xAxisData = chart.currentData.xAxisData,
        yAxisData = chart.currentData.yAxisData,
        legendData = chart.currentData.legendData,

    //lineData = chart.currentData.chartData,
    container = chart.config.container,
        colors = options.color;

    //If a legend element is toggled off, use the new list of headers
    if (options.hasOwnProperty('legendHeaders')) {
        legendData = options.legendHeaders;
    }

    //Get the X and Y Scale
    var x = jvCharts.getAxisScale('x', xAxisData, container, 'no-padding', null, options);
    var y = jvCharts.getAxisScale('y', yAxisData, container, 'no-padding', null, options);

    //If axis are normal
    if (!options.rotateAxis) {
        var area = d3.area().x(function (d) {
            return x(d.x);
        }).y0(container.height).y1(function (d) {
            return y(d.y);
        });
    } else {
        var area = d3.area().y(function (d) {
            return y(d.y);
        }).x1(0).x0(function (d) {
            return x(d.x);
        });
    }

    var data = {};

    for (var i = 0; i < lineData.length; i++) {
        for (var k = 0; k < legendData.length; k++) {

            if (typeof legendData !== "undefined") {
                //Accounting for legend toggles
                if (legendData[k].toggle === false) {
                    //Don't write anything to data
                    continue;
                } else {
                    if (!data[legendData[k]]) {
                        data[legendData[k]] = [];
                    }
                    if (!options.rotateAxis) {
                        data[legendData[k]].push({
                            'x': lineData[i][xAxisData.label],
                            'y': parseFloat(lineData[i][legendData[k]])
                        });
                    } else {
                        data[legendData[k]].push({
                            'y': lineData[i][yAxisData.label],
                            'x': parseFloat(lineData[i][legendData[k]])
                        });
                    }
                }
            } else {
                //Initial creation of visualization w/o legend options
                if (!data[legendData[k]]) {
                    data[legendData[k]] = [];
                }
                if (!options.rotateAxis) {
                    data[legendData[k]].push({
                        'x': lineData[i][xAxisData.label],
                        'y': parseFloat(lineData[i][legendData[k]])
                    });
                } else {
                    data[legendData[k]].push({
                        'y': lineData[i][yAxisData.label],
                        'x': parseFloat(lineData[i][legendData[k]])
                    });
                }
            }
        }
    }

    svg.selectAll(".area").remove();

    var ii = 0;
    for (var i in data) {
        svg.append("path").datum(data[i]).attr("class", function (d) {
            if (chart.options.colorLine == true && chart.options.thresholds != 'none' && chart.options.colorChart != false) {
                return "area area-threshold";
            } else {
                return "area";
            }
        }).attr("d", area).attr("fill", function (d) {
            return jvCharts.getColors(colors, k, i);
        }).attr("opacity", 0.6).attr("transform", function (d, i) {
            if (options.rotateAxis) {
                var translation = container.height / lineData.length / 2;
                return "translate(0, " + translation + ")";
            } else {
                var translation = container.width / lineData.length / 2;
                return "translate(" + translation + ", 0)";
            }
        }).attr("pointer-events", "none");
        ii++;
    }
}

/** generateLine
 *
 * Paints the lines
 * @params lineData
 */
function generateLine(lineData) {
    var chart = this,
        svg = chart.svg,
        options = chart.options,
        container = chart.config.container;

    svg.selectAll("g.line-container").remove();

    //Used to draw line that appears when tool tips are visible
    var tipLineX = 0,
        tipLineWidth = 0,
        tipLineHeight = 0,
        tipLineY = 0;

    var colors = options.color,
        x,
        y;

    svg.selectAll("g.line-container").remove();
    var lines = svg.append("g").attr("class", "line-container").selectAll("g");

    var dataHeaders = chart.options.seriesFlipped ? chart.options.flippedLegendHeaders ? chart.options.flippedLegendHeaders : lineData.legendData : chart.options.legendHeaders ? chart.options.legendHeaders : lineData.legendData;
    var lineDataNew = jvCharts.getToggledData(lineData, dataHeaders);

    //If it's an area chart, add the area
    if (chart.config.type === 'area') {
        chart.fillArea(lineDataNew);
    }

    var lineGroups = generateLineGroups(lines, lineDataNew, chart);
    var eventGroups = jvCharts.generateEventGroups(lines, lineDataNew, chart);

    eventGroups.on("mouseover", function (d, i, j) {
        // Transitions in D3 don't support the 'on' function They only exist on selections. So need to move that event listener above transition and after append
        if (chart.draw.showToolTip) {
            //Get tip data
            var tipData = chart.setTipData(d, i);

            //Draw tip line
            chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
        }
    }).on("mousemove", function (d, i) {
        chart.tip.hideTip();
        svg.selectAll(".tip-line").remove();

        if (chart.draw.showToolTip) {
            var tipData = chart.setTipData(d, i);
            chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
        }
    }).on("mouseout", function (d) {
        chart.tip.hideTip();
        svg.selectAll(".tip-line").remove();
    });

    chart.displayValues();
    chart.generateClipPath();
    chart.generateLineThreshold();

    return lines;
};

/** generateLineGroups
 *
 * Paints the groups of the lines
 * @params chartContainer, barData, chart
 */
function generateLineGroups(lineContainer, lineData, chart) {
    var container = chart.config.container,
        options = chart.options,
        xAxisData = chart.currentData.xAxisData,
        yAxisData = chart.currentData.yAxisData,
        legendData = chart.currentData.legendData,
        colors = options.color,
        lines;

    //Get Position Calculations
    var x = jvCharts.getAxisScale('x', xAxisData, container, 'no-padding', options);
    var y = jvCharts.getAxisScale('y', yAxisData, container, 'no-padding', options);

    var xTranslate, yTranslate;

    if (options.rotateAxis === true) {
        xTranslate = function xTranslate(d, i) {
            return x(d);
        };
        yTranslate = function yTranslate(d, i) {
            return y(lineData[i][yAxisData.label]) + container.height / lineData.length / 2; // + container.height / (lineData.length) / 2  - y.paddingInner());
        };
    } else {
        xTranslate = function xTranslate(d, i) {
            return x(lineData[i][xAxisData.label]) + container.width / lineData.length / 2; // + container.width / (lineData.length) / 2 - x.paddingInner());
        };
        yTranslate = function yTranslate(d, i) {
            return y(d);
        };
    }

    //Append lines and circles

    var data = {};

    for (var i = 0; i < lineData.length; i++) {
        for (var k = 0; k < legendData.length; k++) {

            if (typeof options.legendOptions !== "undefined") {
                //Accounting for legend toggles
                if (options.legendOptions[k].toggle === false) {
                    //Don't write anything to data
                    continue;
                } else {
                    //Write something to data
                    if (!data[legendData[k]]) {
                        data[legendData[k]] = [];
                    }
                    data[legendData[k]].push(parseFloat(lineData[i][legendData[k]]));
                }
            } else {
                //Initial creation of visualization w/o legend options
                if (!data[legendData[k]]) {
                    data[legendData[k]] = [];
                }
                if (data[legendData[k]].length < lineData.length) {
                    data[legendData[k]].push(parseFloat(lineData[i][legendData[k]]));
                }
            }
        }
    }

    chart.svg.selectAll(".lines").remove();

    chart.svg.selectAll(".line").remove();
    chart.svg.selectAll(".circle").remove();
    chart.svg.selectAll("#line-gradient").remove();

    lines = chart.svg.selectAll(".line-container");

    var valueline = {};
    var circles = {};
    var index = 0;
    var lineColors = [];
    var max;
    var min;
    var thresholding = false;
    for (var k in data) {
        //Create path generator for each series
        if (data.hasOwnProperty(k)) {
            valueline[k] = d3.line() //line drawing function
            .x(function (d, i) {
                if (isNaN(d)) {
                    return null;
                }
                return xTranslate(d, i);
            }).y(function (d, i) {
                if (isNaN(d)) {
                    return null;
                }
                return yTranslate(d, i);
            });

            //Add lines to the line-container
            lines.append('g').attr('class', 'line ' + k).append("path") //draws the line
            .attr('stroke', function (d, i, j) {
                var colorObj = jvCharts.getColors(colors, i, k);
                lineColors.push(colorObj);
                return colorObj;
            }) // fills the bar with color
            .attr("stroke-width", "2").attr("fill", "none").attr("d", valueline[k](data[k]));

            //Color Thresholding for each tier
            if (chart.options.thresholds != 'none' && chart.options.colorChart != false) {
                if (chart.options.colorLine) {
                    var thresholdPercents = [];
                    if (chart.options.rotateAxis) {
                        var zero = { percent: 0, color: lineColors[index] };
                        thresholdPercents.push(zero);

                        for (var z = 0; z < Object.keys(chart.options.thresholds).length; z++) {
                            var pCent = chart.options.thresholds[z].threshold * 100 / (xAxisData.max - xAxisData.min);
                            var temp = { percent: pCent, color: chart.options.thresholds[z].thresholdColor };
                            thresholdPercents.push(temp);
                        }
                    } else {
                        var zero = { percent: 0, color: lineColors[index] };
                        thresholdPercents.push(zero);

                        for (var z = 0; z < Object.keys(chart.options.thresholds).length; z++) {
                            var pCent = chart.options.thresholds[z].threshold * 100 / (yAxisData.max - yAxisData.min);
                            var temp = { percent: pCent, color: chart.options.thresholds[z].thresholdColor };
                            thresholdPercents.push(temp);
                        }
                    }

                    var thresholdData = chart.setLineThresholdData(chart, thresholdPercents, lineColors[index]);

                    lines.selectAll("path").attr("class", "line-threshold");

                    if (chart.options.rotateAxis) {
                        chart.svg.append("linearGradient").attr("id", "line-gradient").attr("gradientUnits", "userSpaceOnUse").attr("x1", xTranslate(xAxisData.min)).attr("y1", 0).attr("x2", xTranslate(xAxisData.max)).attr("y2", 0).selectAll("stop").data(thresholdData).enter().append("stop").attr("offset", function (d) {
                            return d.offset;
                        }).attr("stop-color", function (d) {
                            return d.color;
                        });
                    } else {
                        chart.svg.append("linearGradient").attr("id", "line-gradient").attr("gradientUnits", "userSpaceOnUse").attr("x1", 0).attr("y1", yTranslate(yAxisData.min)).attr("x2", 0).attr("y2", yTranslate(yAxisData.max)).selectAll("stop").data(thresholdData).enter().append("stop").attr("offset", function (d) {
                            return d.offset;
                        }).attr("stop-color", function (d) {
                            return d.color;
                        });
                    }
                }
                thresholding = true;
            }

            //Add circles at joints in the lines
            circles[k] = lines.append('g').attr('class', 'circle ' + k).selectAll('circle').data(data[k]).enter().append("circle") //Circles for the joints in the line
            .attr('class', function (d, i) {
                return 'circle-' + chart.currentData.chartData[i][chart.currentData.dataTable.label] + ' highlight-class-' + i;
            }).attr("cx", function (d, i) {
                if (isNaN(d)) {
                    return null;
                }
                return xTranslate(d, i);
            }).attr("cy", function (d, i) {
                if (isNaN(d)) {
                    return null;
                }
                return yTranslate(d, i);
            }).attr('fill', function (d, i, j) {
                if (isNaN(d)) {
                    return null;
                } else if (thresholding == true) {
                    var length = Object.keys(chart.options.thresholds).length - 1;
                    if (chart.options.rotateAxis) {
                        for (var z = length; z > -1; z--) {
                            var threshold = chart.options.thresholds[z];
                            if (d >= threshold.threshold) {
                                return threshold.thresholdColor;
                            }
                        }
                    } else {
                        for (var z = length; z > -1; z--) {
                            var threshold = chart.options.thresholds[z];
                            if (d >= threshold.threshold) {
                                return threshold.thresholdColor;
                            }
                        }
                    }
                }

                return jvCharts.getColors(colors, i, k);
            }).attr('opacity', function (d, i, j) {
                if (isNaN(d)) {
                    return 0;
                }
                return 1;
            }).attr("r", 2.5);

            index++;
        }
    }

    //Return line groups
    return lines.selectAll(".circle");
}

function setLineThresholdData(chart, thresholds, color) {
    var data = [];
    for (var k = 0; k < thresholds.length; k++) {
        var gradient;
        var gradientOne = { offset: thresholds[k].percent + "%", color: thresholds[k].color };
        data.push(gradientOne);

        if (k + 1 < thresholds.length) {
            var gradientTwo = { offset: thresholds[k + 1].percent + "%", color: thresholds[k].color };
            data.push(gradientTwo);
        }

        if (k == thresholds.length - 1) {
            var last = { offset: "100%", color: thresholds[k].color };
            data.push(last);
        }
    }

    return data;
}
module.exports = jvCharts;

},{"../jvCharts.js":3}],14:[function(require,module,exports){
'use strict';

var jvCharts = require('../jvCharts.js');

jvCharts.prototype.circlepack = {
    paint: paint,
    setData: setData
};

jvCharts.prototype.generatePack = generatePack;

/************************************************ Pack functions ******************************************************/

/**setPackChartData
 *  gets pack data and adds it to the chart object
 *
 * @params data, dataTable, colors
 */
function setData(chart) {
    chart.data.legendData = setPackLegendData(chart.data.dataTable);
    //define color object for chartData
    chart.data.color = chart.colors;
}

/**setPackLegendData
 *  gets legend info from chart Data
 *
 * @params data, type
 * @returns [] of legend text
 */
function setPackLegendData(dataTable) {
    var legendArray = [];
    var label = '';
    for (var key in dataTable) {
        if (dataTable.hasOwnProperty(key)) {
            if (key === 'value') {
                label = dataTable[key];
            } else {
                legendArray.push(dataTable[key]);
            }
        }
    }
    legendArray.unshift(label);
    return legendArray;
}

function paint(chart) {
    chart.options.color = chart.data.color;

    chart.currentData = chart.data; //Might have to move into method bc of reference/value relationship

    var packMargins = {
        top: 30,
        right: 20,
        bottom: 15,
        left: 20
    };

    //Generate SVG-legend data is used to determine the size of the bottom margin (set to null for no legend)
    chart.generateSVG(null, packMargins);
    chart.generateVerticalLegend('generatePack');
    chart.generatePack(chart.currentData);
};

/** generatePack
 *
 * paints the pack on the chart
 * @params packData
 */
function generatePack() {
    var chart = this,
        svg = chart.svg,
        container = chart.config.container,
        w = container.width,
        h = container.height,
        r = Math.min(h / 2, w / 3),
        margin = 20,
        diameter = r * 2;

    chart.children = chart.data.chartData;

    var color = d3.scaleOrdinal().range(chart.data.color.map(function (c) {
        c = d3.rgb(c);c.opacity = 0.8;return c;
    }));

    //  assigns the data to a hierarchy using parent-child relationships
    var root = d3.hierarchy(chart.children, function (d) {
        return d.children;
    });

    var pack = d3.pack().size([container.width, container.height]).padding(2);

    pack(root.sum(function (d) {
        return d.hasOwnProperty('children') ? 0 : d.name;
    }).sort(function (a, b) {
        return b.height - a.height || b.value - a.value;
    })).descendants();

    svg.selectAll(".pack").remove();

    var vis = svg.append("g").attr("class", "pack").attr("transform", "translate(" + w / 2 + "," + r + ")");

    var circle = vis.selectAll("circle").data(root.descendants()).enter().append("circle").attr("class", function (d) {
        return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root";
    }).style("fill", function (d) {
        d.color = color(d.depth);
        return d.children ? color(d.depth) : null;
    }).on("click", function (d) {
        if (focus !== d) {
            zoom(d), d3.event.stopPropagation();
        }
    }).on("mouseover", function (d, i) {
        //Get tip data
        var tipData = chart.setTipData(d, i);
        //Draw tip line
        chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
    }).on("mouseout", function (d) {
        chart.tip.hideTip();
    });

    // var text = vis.selectAll("text")
    //     .data(root.descendants())
    //     .enter().append("text")
    //     .attr("class", "label")
    //     .style("display", function(d) {
    //         return d.parent === root ? "inline" : "none";
    //     });

    var node = svg.selectAll("circle,text");

    d3.select("body").on("click", function () {
        zoom(root);
    });

    zoomTo([root.x, root.y, root.r * 2 + margin]);

    function zoom(d) {
        var focus = d;

        d3.transition().duration(d3.event.altKey ? 7500 : 750).tween("zoom", function (d) {
            var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + margin]);
            return function (t) {
                zoomTo(i(t));
            };
        });

        // transition.selectAll("text")
        //     .filter(function(d) {
        //         return d.parent === focus || this.style.display === "inline";
        //     })
        //     .style("fill-opacity", function(d) {
        //         return d.parent === focus ? 1 : 0;
        //     })
        //     .style("display", function(d) {
        //         return d.parent === focus ? "inline" : "none";
        //     })
        //     .each("start", function(d) {
        //         if (d.parent === focus) {
        //            this.style.display = "inline";
        //         }
        //     })
        //     .each("end", function(d) {
        //         if (d.parent !== focus) {
        //           this.style.display = "none";
        //         }
        //     });
    }
    var view;
    function zoomTo(v) {
        var k = diameter / v[2];

        //set global zoom
        view = v;

        node.attr("transform", function (d) {
            if (d && d.x && d.y) {
                return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")";
            }
        });

        circle.attr("r", function (d) {
            return d.r * k;
        });
    }
}

module.exports = jvCharts;

},{"../jvCharts.js":3}],15:[function(require,module,exports){
'use strict';

var jvCharts = require('../jvCharts.js');

jvCharts.prototype.pie = {
    paint: paint,
    setData: setData
};

jvCharts.prototype.generatePie = generatePie;

/************************************************ Pie Data functions ******************************************************/

/**setPieData
 *  gets pie data and adds it to the chart object
 *
 * @params data, dataTable, colors
 */
function setData(chart) {
    chart.data.legendData = setPieLegendData(chart.data);
    //define color object for chartData
    chart.data.color = jvCharts.setChartColors(chart.options.color, chart.data.legendData, chart.colors);
}
/**setPieLegendData
 *  gets legend info from chart Data
 *
 * @params data, type
 * @returns [] of legend text
 */
function setPieLegendData(data) {
    var legendArray = [];
    for (var i = data.chartData.length - 1; i >= 0; i--) {
        legendArray.push(data.chartData[i][data.dataTable.label]);
    }
    return legendArray;
}

function paint(chart) {
    var customMargins = {
        top: 40,
        right: 20,
        bottom: 20,
        left: 20
    };
    chart.currentData = chart.data;
    chart.options.color = chart.data.color;
    chart.legendData = chart.data.legendData;
    chart.generateSVG(chart.data.legendData, customMargins);

    //If the container size is small, don't generate a legend
    if (chart.config.container.width > 550) {
        chart.generateVerticalLegend('generatePie');
    }

    chart.generatePie(chart.currentData);
}

/**generatePie
 *
 * creates and draws a pie chart on the svg element
 * @params svg, pieData, options, container, chartName
 * @returns {{}}
 */
function generatePie(currentData) {
    var chart = this,
        svg = chart.svg,
        pieData = currentData.chartData,
        options = chart.options,
        container = chart.config.container,
        legendData = chart.currentData.legendData,
        chartName = chart.config.name;

    //define variables to change attr's
    svg.select('g.pie-container').remove();

    //var keys = Object.keys(pieData[0]);//Data headers
    var keys = [chart.data.dataTable.label, chart.data.dataTable.value];
    var colors = options.color;

    var w = container.width;
    var h = container.height;
    var r = Math.min(h / 2, w / 3);

    var data = [];
    var total = 0;

    for (var i = 0; i < pieData.length; i++) {
        data[i] = { label: pieData[i][keys[0]], value: pieData[i][keys[1]] };
        //total += parseFloat(pieData[i][keys[1]]);
    }

    var pieDataNew = JSON.parse(JSON.stringify(data)); //copy of pie data


    if (!chart.options.legendHeaders) {
        chart.options.legendHeaders = legendData;
    }

    var dataHeaders = chart.options.legendHeaders;

    var legendElementToggleArray = jvCharts.getLegendElementToggleArray(dataHeaders, legendData);

    if (legendElementToggleArray) {
        for (var j = 0; j < pieDataNew.length; j++) {
            for (var i = 0; i < legendElementToggleArray.length; i++) {
                if (legendElementToggleArray[i].element === pieDataNew[j].label && legendElementToggleArray[i].toggle === false) {
                    //pieDataNew.splice(j,1);
                    pieDataNew[j].value = 0;
                }
            }
        }
    }

    for (var i = 0; i < pieDataNew.length; i++) {
        total += parseFloat(pieDataNew[i].value);
    }

    var vis = svg.append('g').data([pieDataNew]).attr('class', 'pie-container').attr('height', 200).attr('transform', 'translate(' + w / 2 + ',' + r + ')');

    var pie = d3.pie().value(function (d) {
        return d.value;
    });

    //declare an arc generator function
    var arc = d3.arc().innerRadius(0) //Normal pie chart when this = 0, can be changed to create donut chart
    .outerRadius(r);

    var arcOver = d3.arc().innerRadius(0).outerRadius(r + 15);

    //select paths, use arc generator to draw
    var arcs = vis.selectAll('g.slice').data(pie).enter().append('g').attr('class', 'slice');

    arcs.append('path').attr('fill', function (d, i) {
        return jvCharts.getColors(colors, i, pieData[i][keys[0]]);
    }).attr('d', function (d) {
        return arc(d);
    }).attr('class', function (d, i) {
        return 'editable editable-pie pie-slice-' + i + ' highlight-class-' + i;
    }).attr('stroke', '#FFFFFF').attr('stroke-width', 1).on('mouseover', function (d, i) {
        if (chart.draw.showToolTip) {
            //Get tip data
            var tipData = chart.setTipData(d.data, i);
            //Draw tip line
            chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);

            arcs.selectAll('*').style('opacity', 0.7);
            var slice = d3.select(this);
            slice.style('opacity', 1);
            slice.transition().duration(200).attr('d', arcOver);
        }
    }).on('mousemove', function (d, i) {
        if (chart.draw.showToolTip) {
            chart.tip.hideTip();
            //Get tip data
            var tipData = chart.setTipData(d.data, i);
            //Draw tip line
            chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
        }
    }).on('mouseout', function (d) {
        chart.tip.hideTip();
        arcs.selectAll('*').style('opacity', 1);
        d3.select(this).transition().duration(250).attr('d', arc);
    });

    arcs.append('svg:text').attr('class', 'sliceLabel').attr('transform', function (d) {
        var test = arc.centroid(d);
        test[0] = test[0] * 1.6;
        test[1] = test[1] * 1.6;
        return 'translate(' + test + ')';
    }).attr('dy', '.35em').attr('text-anchor', 'middle').text(function (d, i) {
        var percent = pieDataNew[i].value / total * 100;
        percent = d3.format('.1f')(percent);
        if (percent > 5) {
            return percent + '%';
        }
    }).attr('font-size', chart.options.fontSize).attr('fill', '#FFFFFF').attr('pointer-events', 'none');
}

module.exports = jvCharts;

},{"../jvCharts.js":3}],16:[function(require,module,exports){
'use strict';

var jvCharts = require('../jvCharts.js');

jvCharts.prototype.radial = {
    paint: paint,
    setData: setData
};

jvCharts.prototype.generateRadial = generateRadial;

/************************************************ Radial Data functions ******************************************************/
/**setRadialChartData
 *  gets bar data and adds it to the chart object
 *
 * @params data, dataTable, colors
 */
function setData(chart) {
    chart.data.legendData = setRadialLegendData(chart.data);
    //define color object for chartData
    chart.data.color = jvCharts.setChartColors(chart.options.color, chart.data.legendData, chart.colors);
}

function paint(chart) {
    chart.options.color = chart.data.color;

    chart.currentData = chart.data; //Might have to move into method bc of reference/value relationship

    var radialMargins = {
        top: 40,
        right: 20,
        bottom: 20,
        left: 20
    };

    //Generate SVG-legend data is used to determine the size of the bottom margin (set to null for no legend)
    chart.generateSVG(null, radialMargins);
    chart.generateVerticalLegend('generateRadial');
    chart.generateRadial();
}

/**setRadialLegendData
 *  gets legend info from chart Data
 *
 * @params data, type
 * @returns [] of legend text
 */
function setRadialLegendData(data) {
    var legendArray = [];
    for (var i = 0; i < data.chartData.length; i++) {
        if (legendArray.indexOf(data.chartData[i][data.dataTable.label]) == -1) {
            legendArray.push(data.chartData[i][data.dataTable.label]);
        }
    }
    return legendArray;
}

/**generateRadial
 *
 * paints the radil bar chart on the chart
 * @params radialData
 */

function generateRadial() {
    var chart = this,
        svg = chart.svg,
        colors = chart.options.color,
        container = chart.config.container,
        legendData = chart.data.legendData,
        radialData = chart.data.chartData,
        tickNumber = 3,
        barHeight = container.height / 2 - 40,
        width = container.width,
        height = container.height,
        r = Math.min(height / 2, width / 3),
        data = [],
        allKeys = [chart.data.dataTable.label, chart.data.dataTable.value],
        radialDataNew,
        dataHeaders,
        legendElementToggleArray = [],
        radialDataFiltered;

    for (var i = 0; i < radialData.length; i++) {
        data[i] = { label: radialData[i][allKeys[0]], value: radialData[i][allKeys[1]] };
        //total += parseFloat(radialData[i][keys[1]]);
    }

    radialDataNew = JSON.parse(JSON.stringify(data)); //copy of pie data


    if (!chart.options.legendHeaders) {
        chart.options.legendHeaders = legendData;
    }

    dataHeaders = chart.options.legendHeaders;
    legendElementToggleArray = jvCharts.getLegendElementToggleArray(dataHeaders, legendData);
    radialDataFiltered = [];

    if (legendElementToggleArray) {
        for (var j = 0; j < radialDataNew.length; j++) {
            for (var i = 0; i < legendElementToggleArray.length; i++) {
                if (legendElementToggleArray[i].element === radialDataNew[j].label && legendElementToggleArray[i].toggle === false) {
                    radialDataNew[j].value = -1;
                }
            }
        }
    }

    for (var j = 0; j < radialDataNew.length; j++) {
        if (radialDataNew[j].value !== -1) {
            radialDataFiltered.push(radialDataNew[j]);
        }
    }

    radialDataFiltered.sort(function (a, b) {
        return b.value - a.value;
    });

    //Remove existing bars from page
    svg.selectAll('g.radial-container').remove();

    var vis = svg.append('g').attr('class', 'radial-container').attr('height', height).attr('transform', 'translate(' + width / 2 + ',' + r + ')');

    var extent = d3.extent(radialDataFiltered, function (d) {
        return d.value;
    });

    //commas and 0 decimals
    var formatNumber = d3.format(',.0f');
    if (extent[1] >= 1000000) {
        //millions
        var p = d3.precisionPrefix(1e5, 1.3e6);
        formatNumber = d3.formatPrefix('.' + p, 1.3e6);
    } else if (extent[1] <= 100) {
        //2 decimals
        formatNumber = d3.format(',.2f');
    }

    if (extent[0] !== 0) {
        extent[0] = 0;
    }
    var barScale = d3.scaleLinear().domain(extent).range([0, barHeight]);

    var keys = radialDataFiltered.map(function (d, i) {
        return d.label;
    });
    var numBars = keys.length;

    var x = d3.scaleLinear().domain(extent).range([0, -barHeight]);

    //create xAxis drawing function
    var xAxis = d3.axisLeft().scale(x).ticks(tickNumber).tickFormat(formatNumber);

    vis.selectAll('circle').data(x.ticks(3)).enter().append('circle').attr('r', function (d) {
        return barScale(d);
    }).style('fill', 'none').style('stroke', 'black').style('stroke-dasharray', '2,2').style('stroke-width', '.5px');

    var arc = d3.arc().startAngle(function (d, i) {
        return i * 2 * Math.PI / numBars;
    }).endAngle(function (d, i) {
        return (i + 1) * 2 * Math.PI / numBars;
    }).innerRadius(0);

    var segments = vis.selectAll('path').data(radialDataFiltered).enter().append('g')
    //.attr("class", "label")
    .append('path').each(function (d) {
        d.outerRadius = 0;
    }).style('fill', function (d, i) {
        return jvCharts.getColors(colors, i, d.label);
    }).attr('d', arc).on('mousemove', function (d, i) {
        if (chart.draw.showToolTip) {
            //chart.tip.hideTip();
            //Get tip data
            var tipData = chart.setTipData(d, i);
            //Draw tip line
            chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
        }
    }).on('mouseout', function (d) {
        if (chart.draw.showToolTip) {
            chart.tip.hideTip();
            svg.selectAll('line.tip-line').remove();
        }
    });

    segments.transition().duration(800).ease(d3.easeElastic).delay(function (d, i) {
        return 750 - 50 * i;
    }).attrTween('d', function (d, index) {
        var i = d3.interpolate(d.outerRadius, barScale(+d.value));
        return function (t) {
            d.outerRadius = i(t);
            return arc(d, index);
        };
    });

    vis.append('circle').attr('r', barHeight).classed('outer', true).style('fill', 'none').style('stroke', 'black').style('stroke-width', '1.5px');

    vis.selectAll('line').data(keys).enter().append('g').attr('class', 'label').append('line').attr('y2', -barHeight - 20).style('stroke', 'black').style('stroke-width', '.5px').attr('transform', function (d, i) {
        return 'rotate(' + i * 360 / numBars + ')';
    });

    var axisGroup = vis.append('g').attr('class', 'xAxis').style('pointer-events', 'none').call(xAxis);
    var yAxisClass = 'yAxisLabels editable editable-yAxis editable-text editable-num';

    axisGroup.selectAll('text').attr('fill', 'black') //Customize the color of axis labels
    .attr('class', yAxisClass).attr('transform', function (d) {
        if (d === xAxis.scale().ticks(tickNumber)[tickNumber]) {
            return 'translate(0, 10)';
        }
        return 'translate(0,0)';
    }).attr('font-size', chart.options.fontSize).append('svg:title');
}

module.exports = jvCharts;

},{"../jvCharts.js":3}],17:[function(require,module,exports){
'use strict';

var jvCharts = require('../jvCharts.js');

jvCharts.prototype.sankey = {
    paint: paint,
    setData: setData
};

jvCharts.prototype.generateSankey = generateSankey;

/************************************************ Sankey functions ******************************************************/
/**
 *
 * @param data
 * @param dataTable
 * @param colors
 */
function setData(chart) {
    var sankeyData = {},
        data = chart.data.chartData,
        dataTable = chart.data.dataTable;

    sankeyData.links = [];
    sankeyData.nodes = [];

    //Iterate through sources and targets to make a node list
    var nodeList = [];
    for (var item in dataTable) {
        if (item === "value") {
            continue;
        };
        for (var i = 0; i < data.length; i++) {
            var potentialNode = data[i][dataTable[item]];
            var addToList = true;
            for (var j = 0; j < nodeList.length; j++) {
                if (potentialNode === nodeList[j]) {
                    addToList = false;
                    break;
                }
            }
            if (addToList) {
                nodeList.push(potentialNode);
            }
        }
    }
    //Create nodes object
    for (var i = 0; i < nodeList.length; i++) {
        sankeyData.nodes.push({
            "name": nodeList[i]
        });
    }

    sankeyData.links = data.map(function (x) {
        return {
            "source": x[dataTable.start],
            "target": x[dataTable.end],
            "value": x[dataTable.value]
        };
    });

    var nodeMap = {};
    for (var i = 0; i < sankeyData.nodes.length; i++) {
        sankeyData.nodes[i].node = i;
        nodeMap[sankeyData.nodes[i].name] = i;
    }
    sankeyData.links = sankeyData.links.map(function (x) {
        return {
            source: nodeMap[x.source],
            target: nodeMap[x.target],
            value: x.value
        };
    });

    chart.data.chartData = sankeyData;
    chart.data.color = d3.scaleOrdinal(d3.schemeCategory20);
}

function paint(chart) {
    var data = chart.data.chartData;

    //generate SVG
    chart.generateSVG();
    chart.generateSankey(data);
}

/**
 * Generates a sankey chart with the given data
 * @param sankeyData
 */
function generateSankey(sankeyData) {
    var chart = this,
        svg = chart.svg,
        color = chart.options.color;

    var width = chart.config.container.width;
    var height = chart.config.container.height;

    var formatNumber = d3.format(",.0f"),
        // zero decimal places
    format = function format(d) {
        return formatNumber(d) + " " + "Widgets";
    },
        color = d3.scaleOrdinal(d3.schemeCategory20);

    //var nodeMap = {};
    //for (var i = 0; i < sankeyData.nodes.length; i++) {
    //    sankeyData.nodes[i].node = i;
    //    nodeMap[sankeyData.nodes[i].name] = i;
    //}
    //sankeyData.links = sankeyData.links.map(function(x){
    //    return {
    //        source: nodeMap[x.source],
    //        target: nodeMap[x.target],
    //        value: x.value
    //    };
    //});

    var sankey = d3.sankey().nodeWidth(10).nodePadding(15).size([width, height]);

    var path = sankey.link();

    // //Adding zoom v4 behavior to sankey
    d3.selectAll("svg").call(d3.zoom().scaleExtent([.1, 10]).on("zoom", zoom)); //zoom event listener

    sankey.nodes(sankeyData.nodes).links(sankeyData.links).layout(32);

    var link = svg.append("g").selectAll(".sankey-link").data(sankeyData.links).enter().append("path").filter(function (d) {
        return d.value > 0;
    }).attr("class", "sankey-link").attr("d", path).style("stroke-width", function (d) {
        return Math.max(1, d.dy);
    }).sort(function (a, b) {
        return b.dy - a.dy;
    }).on("mouseover", function (d, i) {
        if (chart.draw.showToolTip) {
            var tipData = chart.setTipData(d, i);
            chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
        }
    }).on("mousemove", function (d, i) {
        if (chart.draw.showToolTip) {
            chart.tip.hideTip();
            var tipData = chart.setTipData(d, i);
            chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
        }
    }).on("mouseout", function (d, i) {
        if (chart.draw.showToolTip) {
            chart.tip.hideTip();
        }
    });

    var node = svg.append("g").selectAll(".node").data(sankeyData.nodes).enter().append("g").filter(function (d) {
        return d.value > 0;
    }).attr("class", "node").attr("transform", function (d) {
        return "translate(" + d.x + ", " + d.y + ")";
    }).call(d3.drag().subject(function (d) {
        return d;
    }).on("start", function (d) {
        d3.event.sourceEvent.stopPropagation();
        this.parentNode.appendChild(this);
    }).on("drag", dragmove));

    node.append("rect").attr("height", function (d) {
        return Math.max(d.dy, 0);
    }).attr("width", sankey.nodeWidth()).style("fill", function (d) {
        return d.color = color(d.name);
    }).style("stroke", function (d) {
        return d3.rgb(d.color).darker(2);
    });

    node.append("text").attr("x", -6).attr("y", function (d) {
        return d.dy / 2;
    }).attr("dy", ".35em").attr("text-anchor", "end").attr("transform", null).attr("transform", null).text(function (d) {
        return d.name;
    }).filter(function (d) {
        return d.x < width / 2;
    }).attr("x", 6 + sankey.nodeWidth()).attr("text-anchor", "start");

    function dragmove(d) {
        d3.select(this).attr("transform", "translate(" + (d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))) + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
        sankey.relayout();
        link.attr("d", path);
    }

    function zoom() {
        //Implementing the v4 zooming feature
        svg.attr("transform", d3.event.transform);
    }
}

module.exports = jvCharts;

},{"../jvCharts.js":3}],18:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var jvCharts = require('../jvCharts.js');

jvCharts.prototype.scatterplot = {
    paint: paint,
    setData: setData
};

jvCharts.prototype.generateScatter = generateScatter;
jvCharts.prototype.createLineGuide = createLineGuide;

/************************************************ Scatter functions ******************************************************/

/**setScatterData
 *  gets scatter data and adds it to the chart object
 *
 * @params data, dataTable, colors
 */
function setData(chart) {
    chart.data.legendData = setScatterLegendData(chart.data);
    chart.data.xAxisData = setScatterAxisData(chart.data, 'x', chart.options);
    chart.data.yAxisData = setScatterAxisData(chart.data, 'y', chart.options);
    chart.data.zAxisData = chart.data.dataTable.hasOwnProperty('z') ? setScatterAxisData(chart.data, 'z', chart.options) : {};
    //define color object for chartData
    chart.data.color = jvCharts.setChartColors(chart.options.color, chart.data.legendData, chart.colors);
}

/**setScatterLegendData
 *  gets legend info from chart Data
 *
 * @params data, type
 * @returns [] of legend text
 */
function setScatterLegendData(data) {
    var legendArray = [];
    if (data.dataTable.hasOwnProperty('series')) {
        var item = data.dataTable.series;
        for (var value in data.chartData) {
            var legendElement = data.chartData[value][item];
            if (legendArray.indexOf(legendElement) === -1) {
                legendArray.push(legendElement);
            }
        }
    } else if (data.dataTable.hasOwnProperty('label')) {
        legendArray.push(data.dataTable.label);
    }
    if (typeof legendArray[0] === 'undefined') {
        legendArray = [];
        legendArray.push(data.dataTable.label);
    }
    //order legend data in alphabetical order
    legendArray.sort();
    return legendArray;
}

/**setScatterAxisData
 *  gets z axis data based on the chartData
 *
 * @params data, dataTable
 * @returns object with label and values
 */
function setScatterAxisData(data, axis, options) {
    //declare vars
    var axisData = [],
        chartData = data.chartData,
        scatterLabel = data.dataTable[axis],
        label,
        min = scatterLabel ? chartData[0][scatterLabel] : 0,
        max = scatterLabel ? chartData[0][scatterLabel] : 0,
        dataType;

    for (var j = 0; j < data.dataTableKeys.length; j++) {
        if (data.dataTableKeys[j].vizType === axis) {
            dataType = data.dataTableKeys[j].type;
            break;
        }
    }
    //loop over data to find max and min
    //also determines the y axis total if the data is stacked
    for (var i = 1; i < chartData.length; i++) {
        if (chartData[i].hasOwnProperty(scatterLabel)) {
            var num = chartData[i][scatterLabel];
            if (!isNaN(num)) {
                num = parseFloat(num);
                if (num > max) {
                    max = num;
                } else if (num < min) {
                    min = num;
                }
            }
        }
    }
    if (axis !== 'z') {
        min *= 0.9;
        max *= 1.1;
    }

    if (options) {
        if (options.yMin && !isNaN(options.yMin) && axis === 'y') {
            min = options.yMin;
        }
        if (options.yMax && !isNaN(options.yMax) && axis === 'y') {
            max = options.yMax;
        }
        if (options.xMin && !isNaN(options.xMin) && axis === 'x') {
            min = options.xMin;
        }
        if (options.xMax && !isNaN(options.xMax) && axis === 'x') {
            max = options.xMax;
        }
    }

    axisData.push(min);
    axisData.push(max);
    return {
        'label': scatterLabel,
        'values': axisData,
        'dataType': 'NUMBER',
        'min': min,
        'max': max
    };
}

function paint(chart) {
    var dataObj = {};

    dataObj.chartData = chart.data.chartData;
    dataObj.legendData = chart.data.legendData;
    dataObj.dataTable = chart.data.dataTable;
    chart.options.color = chart.data.color;
    dataObj.xAxisData = chart.data.xAxisData;
    dataObj.yAxisData = chart.data.yAxisData;
    dataObj.zAxisData = chart.data.zAxisData;
    chart.currentData = dataObj;

    //generate svg dynamically based on legend data
    chart.generateSVG(dataObj.legendData);

    //TODO remove these from draw object
    chart.generateXAxis(chart.currentData.xAxisData);
    chart.generateYAxis(chart.currentData.yAxisData);
    chart.generateLegend(chart.currentData.legendData, 'generateScatter');

    chart.generateScatter();
    chart.createLineGuide();

    if (typeof dataObj.xAxisScale.ticks === "function") {
        chart.formatXAxisLabels(dataObj.xAxisScale.ticks().length);
    } else {
        chart.formatXAxisLabels(dataObj.xAxisScale.domain().length);
    }
}

function calculateMean(data, type) {
    return d3.mean(data, function (value) {
        return +value[type];
    });
}

function createLineGuide() {
    var chart = this,
        svg = chart.svg,
        options = chart.options,
        container = chart.config.container,
        chartData = chart.currentData.chartData,
        dataTable = chart.currentData.dataTable,
        xAxisData = chart.currentData.xAxisData,
        yAxisData = chart.currentData.yAxisData;

    var xLineVal = calculateMean(chartData, dataTable.x);
    var yLineVal = calculateMean(chartData, dataTable.y);

    var x = jvCharts.getAxisScale('x', xAxisData, container, null, options);
    var y = jvCharts.getAxisScale('y', yAxisData, container, null, options);

    svg.selectAll('g.lineguide.x').remove();
    svg.selectAll('g.lineguide.y').remove();

    var lineGroup = svg.append('g').attr('class', 'line-group');

    //x line group for crosshair
    var lineGuideX = lineGroup.append('g').attr('class', 'lineguide x').append('line').style('stroke', 'gray').style('stroke-dasharray', '3, 3').style('opacity', function () {
        if (options.lineGuide) {
            return 1;
        }
        return 0;
    }).style('fill', 'black');

    //y line group for crosshair
    var lineGuideY = lineGroup.append('g').attr('class', 'lineguide y').append('line').style('stroke', 'gray').style('stroke-dasharray', '3, 3').style('opacity', function () {
        if (options.lineGuide) {
            return 1;
        }
        return 0;
    }).style('fill', 'black');

    //create crosshair based on median x (up/down) 'potentially' passed with data
    lineGuideX.attr('x1', x(xLineVal)).attr('y1', 0).attr('x2', x(xLineVal)).attr('y2', container.height);

    //create crosshair based on median y (left/right) 'potentially' passed with data
    lineGuideY.attr('x1', 0).attr('y1', y(yLineVal)).attr('x2', container.width).attr('y2', y(yLineVal));

    return lineGroup;
}
/**generateScatter
 *
 * creates and draws a scatter plot on the svg element
 * @params svg, scatterData, options, xAxisData, yAxisData, zAxisData, container, dataTable legendData, chartName
 * @returns {{}}
 */
function generateScatter() {
    var chart = this,
        svg = chart.svg,
        options = chart.options,
        container = chart.config.container,
        chartName = chart.config.name,
        scatterData = chart.currentData.chartData,
        dataTable = chart.currentData.dataTable,
        xAxisData = chart.currentData.xAxisData,
        yAxisData = chart.currentData.yAxisData,
        zAxisData = chart.currentData.zAxisData,
        legendData = chart.currentData.legendData,
        colors = options.color,
        keys = [dataTable.label, dataTable.x, dataTable.y, dataTable.z, dataTable.series],
        data = [],
        total = 0,
        scatterDataNew = JSON.parse(JSON.stringify(scatterData));

    if (!options.NODE_MIN_SIZE) {
        options.NODE_MIN_SIZE = 4.5;
    }
    if (!options.NODE_MAX_SIZE) {
        options.NODE_MAX_SIZE = 25;
    }

    svg.selectAll('g.scatter-container').remove();
    svg.selectAll('g.scatter-container.editable-scatter').remove();

    if (!chart.options.legendHeaders) {
        chart.options.legendHeaders = legendData;
    }

    var dataHeaders = chart.options.legendHeaders;
    var legendElementToggleArray = jvCharts.getLegendElementToggleArray(dataHeaders, legendData);
    var scatterDataFiltered = [];

    if (legendElementToggleArray) {
        for (var j = 0; j < scatterDataNew.length; j++) {
            for (var i = 0; i < legendElementToggleArray.length; i++) {
                if (typeof scatterDataNew[j][dataTable.label] === 'undefined' || scatterDataNew[j][dataTable.label] === '') {
                    if (legendElementToggleArray[i].toggle === false) {
                        scatterDataNew[j][dataTable.x] = -1;
                        scatterDataNew[j][dataTable.y] = -1;
                        scatterDataNew[j][dataTable.z] = -1;
                    }
                } else if (legendElementToggleArray[i].element === scatterDataNew[j][dataTable.series] && legendElementToggleArray[i].toggle === false) {
                    scatterDataNew[j][dataTable.x] = -1;
                    scatterDataNew[j][dataTable.y] = -1;
                    scatterDataNew[j][dataTable.z] = -1;
                }
            }
        }
    }

    for (var j = 0; j < scatterDataNew.length; j++) {
        if (scatterDataNew[j][dataTable.x] !== -1 && scatterDataNew[j][dataTable.y] !== -1) {
            scatterDataFiltered.push(scatterDataNew[j]);
        }
    }

    var x = jvCharts.getAxisScale('x', xAxisData, container, null, options);
    var y = jvCharts.getAxisScale('y', yAxisData, container, null, options);

    if (zAxisData && (typeof zAxisData === 'undefined' ? 'undefined' : _typeof(zAxisData)) === 'object' && Object.keys(zAxisData).length > 0) {
        console.log(zAxisData);
        var z = jvCharts.getZScale(zAxisData, container, options);
    }

    var cxTranslate, cyTranslate;

    cxTranslate = function cxTranslate(d, i) {
        return x(scatterDataFiltered[i][xAxisData.label]);
    };
    cyTranslate = function cyTranslate(d, i) {
        return y(scatterDataFiltered[i][yAxisData.label]);
    };

    var scatters = svg.append('g').attr('class', 'scatter-container').selectAll('g');

    var scatterGroup = scatters.data(function () {
        return scatterDataFiltered;
    }).enter().append('circle').attr('class', function (d, i) {
        return 'editable editable-scatter scatter-circle-' + i + ' highlight-class';
    }).attr('cx', function (d, i) {
        return cxTranslate(d, i);
    }).attr('cy', function (d, i) {
        return cyTranslate(d, i);
    }).attr("opacity", 0.8).attr('r', function (d, i) {
        if (dataTable.hasOwnProperty('z')) {
            if (options.toggleZ && zAxisData && (typeof zAxisData === 'undefined' ? 'undefined' : _typeof(zAxisData)) === 'object' && Object.keys(zAxisData).length > 0 && scatterDataFiltered[i][dataTable.z]) {
                return z(scatterDataFiltered[i][dataTable.z]);
            }
        }
        return options.NODE_MIN_SIZE;
    }).on('mouseover', function (d, i, j) {
        if (chart.draw.showToolTip) {
            var tipData = chart.setTipData(d, i);

            //Draw tip line
            chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
        }
    }).on('mousemove', function (d, i) {
        if (chart.draw.showToolTip) {
            chart.tip.hideTip();
            //Get tip data
            var tipData = chart.setTipData(d, i);
            //Draw tip line
            chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
        }
    }).on('mouseout', function () {
        if (chart.draw.showToolTip) {
            chart.tip.hideTip();
        }
    }).attr('fill', function (d, i) {
        var color;
        if (dataTable.hasOwnProperty('series')) {
            color = jvCharts.getColors(colors, i, scatterDataFiltered[i][dataTable.series]);
        } else {
            color = jvCharts.getColors(colors, i, scatterDataFiltered[i][dataTable.label]);
        }
        return color;
    });

    return scatters;
}

module.exports = jvCharts;

},{"../jvCharts.js":3}],19:[function(require,module,exports){
'use strict';

var jvCharts = require('../jvCharts.js');

jvCharts.prototype.singleaxis = {
    paint: paint,
    setData: setData
};

jvCharts.prototype.getSingleAxisData = getSingleAxisData;
jvCharts.prototype.getSingleAxisZ = getSingleAxisZ;
jvCharts.prototype.generatePoints = generatePoints;

/************************************************ Single Axis Cluster functions ******************************************************/

function setData(chart) {
    chart.currentData = { chartData: chart.data.chartData, dataTable: chart.data.dataTable };

    //Set the legend Data to the label from dataTable Keys
    chart.currentData.legendData = [chart.currentData.dataTable.x];
    chart.currentData.xAxisData = chart.getSingleAxisData(chart.currentData.chartData, chart.currentData.dataTable);

    if (chart.currentData.dataTable.hasOwnProperty('size')) {
        chart.currentData.zAxisData = chart.getSingleAxisZ(chart.currentData.chartData);
    }

    chart.currentData.color = 'red'; //chart.setChartColors (chart.options.color, chart.data.legendData, colors);
}

function paint(chart) {
    var splitData = {},
        //If there is a split, the data that has been split
    numVizzes,
        //If there is a split, the number of single axis clusters that are created
    customSize = {},
        //If there is a split, the svg needs to be a custom predefined height
    margin = {
        top: 40,
        left: 100,
        right: 75,
        bottom: 50
    };

    //If there is a split on the viz, run through this logic
    if (chart.options.splitData != "" && chart.options.splitData != "none") {
        //Check to see how many vizzes need to be created because of the split

        var splitDataKeys = [];
        var splitOptionName = chart.options.splitData.replace(/_/g, " ");

        for (var i = 0; i < chart.currentData.chartData.length; i++) {
            var addToKeys = true;
            for (var j = 0; j < splitDataKeys.length; j++) {
                if (chart.currentData.chartData[i][splitOptionName] === splitDataKeys[j]) {
                    addToKeys = false;
                    break;
                }
            }
            if (addToKeys) {
                splitDataKeys.push(chart.currentData.chartData[i][splitOptionName]);
            }
        }

        //Create Object with keys and assign each element of the data array to corresponding object
        for (var i = 0; i < splitDataKeys.length; i++) {
            splitData[splitDataKeys[i]] = []; //Assign empty array to each location
        }

        //Assign Data elements to appropriate place in splitData object
        for (var i = 0; i < chart.currentData.chartData.length; i++) {
            splitData[chart.currentData.chartData[i][splitOptionName]].push(chart.currentData.chartData[i]);
        }

        numVizzes = splitDataKeys.length;

        customSize = {};

        customSize.height = numVizzes * 300;

        chart.generateSVG(chart.currentData.legendData, margin, customSize);
        chart.generateXAxis(chart.currentData.xAxisData);
        chart.drawGridlines(chart.currentData.xAxisData);

        for (var i = 0; i < numVizzes; i++) {
            chart.generatePoints(splitData[splitDataKeys[i]], i);
        }
    }
    //When there isn't a split, the base case
    else {
            chart.generateSVG(chart.currentData.legendData, margin);
            chart.generateXAxis(chart.currentData.xAxisData);
            chart.drawGridlines(chart.currentData.xAxisData);
            chart.generatePoints(chart.currentData.chartData);
        }

    if (typeof chart.currentData.xAxisScale.ticks === "function") {
        chart.formatXAxisLabels(chart.currentData.xAxisScale.ticks().length);
    } else {
        chart.formatXAxisLabels(chart.currentData.xAxisScale.domain().length);
    }
}

function getSingleAxisZ(data) {
    var chart = this,
        size = chart.currentData.dataTable.size,
        min = data[0][size],
        max = data[0][size];
    //Find min and max of the data
    for (var i = 0; i < data.length; i++) {
        var num = data[i][size];
        if (num > max) {
            max = num;
        } else if (num < min) {
            min = num;
        }
    }

    return {
        'min': min,
        'max': max,
        'label': size
    };
}

function generatePoints(data, yLevel) {
    var chart = this,
        svg = chart.svg,
        width = chart.config.container.width,
        height = chart.config.container.height,
        dataTable = chart.currentData.dataTable,
        xAxisData = chart.currentData.xAxisData,
        zAxisData = chart.currentData.zAxisData,
        options = chart.options,
        container = chart.config.container,
        pointColor = "#609cdb",
        coloredPoint = "#e88a17";

    var x = jvCharts.getAxisScale('x', xAxisData, chart.config.container, null, null, chart.options);

    var SPLIT_CLUSTER_HEIGHT = 300;
    var TRANSLATE_SPLIT_CLUSTER = 150;

    //If there's a split, account for the multiple axes
    var currentAxisHeight;
    if (yLevel != null) {
        currentAxisHeight = yLevel * SPLIT_CLUSTER_HEIGHT + TRANSLATE_SPLIT_CLUSTER; //Each height is 100px
    } else {
        currentAxisHeight = height / 2;
    }

    if (!options.NODE_MIN_SIZE) {
        options.NODE_MIN_SIZE = 4.5;
    }
    if (!options.NODE_MAX_SIZE) {
        options.NODE_MAX_SIZE = 25;
    }

    //Add a path line through the height of the axis
    if (yLevel != null) {
        svg.append("line").attr("x1", 0).attr("x2", container.width).attr("y1", currentAxisHeight).attr("y2", currentAxisHeight).attr("stroke", "white").attr("stroke-width", "20px").attr("transform", "translate(0, " + TRANSLATE_SPLIT_CLUSTER + ")");

        svg.append("text").datum(data).attr("x", 0).attr("y", currentAxisHeight).text(function (d, i) {
            return d[0][options.splitData.replace(/_/g, ' ')];
        }).attr("transform", "translate(-85, 0)");
    }

    var simulation = d3.forceSimulation(data).alphaDecay(.05).force("x", d3.forceX(function (d) {
        return x(d[dataTable.x]);
    }).strength(1)).force("y", d3.forceY(currentAxisHeight)).force("collide", d3.forceCollide(function (d, i) {
        //Set collision radius equal to the radius of the circle
        if (dataTable.hasOwnProperty('size')) {
            var norm = (d[dataTable.size] - zAxisData.min) / (zAxisData.max - zAxisData.min);
            var val = (options.NODE_MAX_SIZE - options.NODE_MIN_SIZE) * norm + options.NODE_MIN_SIZE;
        } else {
            var val = options.NODE_MIN_SIZE;
        }
        return val;
    }).strength(1)).force("charge", d3.forceManyBody().strength(-6)).stop();
    //

    //On Draw Move Points
    function moveTowardDataPosition(alpha) {
        return function (d) {
            d.x += (x(d.x) - d.x) * .1 * alpha;
            d.y += (y(d.y) - d.y) * .05 * alpha;
        };
    }

    for (var i = 0; i < 120; ++i) {
        simulation.tick();
    }var cell = svg.append("g").attr("class", "cells").selectAll("g").data(d3.voronoi().extent([[0, 0], [width, height]]).x(function (d) {
        return d.x;
    }).y(function (d) {
        return d.y;
    }).polygons(data)).enter().append("g").attr("class", "cell-container");

    cell.append("circle").attr("r", function (d, i, j) {
        //if(d == null){
        //    console.log(d + " is undefined at index " + i);
        //}
        //else{
        //    console.log(d.data.Title);
        //}
        if (dataTable.hasOwnProperty('size') && d != null && d.hasOwnProperty('data')) {
            var norm = (d.data[dataTable.size] - zAxisData.min) / (zAxisData.max - zAxisData.min);
            if (!isNaN(norm)) {
                var val = (options.NODE_MAX_SIZE - options.NODE_MIN_SIZE) * norm + options.NODE_MIN_SIZE;
            } else {
                //If there is only 1 node on the chart
                var val = options.NODE_MIN_SIZE;
            }
        } else if (d == null) {
            var val = 0; //Don't display undefined nodes
        } else {
            var val = options.NODE_MIN_SIZE; //Default node size of 15
        }
        //val = 3;
        return val;
    }).attr("cx", function (d) {
        if (d == null) {
            return;
        } else {
            return d.data.x;
        }
    }).attr("cy", function (d) {
        if (d == null) {
            return;
        } else {
            return d.data.y;
        }
    }).attr("fill", function (d) {
        if (d != null && d.data[options.colorDataCategory] === options.colorDataInstance) {
            return coloredPoint;
        } else {
            return pointColor;
        }
    }).attr("opacity", .8).attr("stroke", "black").attr("stroke-width", 1).on("mouseenter", function (d, i) {
        if (chart.draw.showToolTip) {
            var tipData = chart.setTipData(d, i);
            chart.tip.generateSimpleTip(tipData, dataTable, d3.event);
        }
        d3.select(this).attr("fill", "red");
        //d3.select(this)
        //    .attr("fill", "blue");
    }).on("mouseleave", function (d, i) {
        if (chart.draw.showToolTip) {
            chart.tip.hideTip();
        }
        d3.select(this).attr("fill", function (d) {
            if (d != null && d.data[options.colorDataCategory] === options.colorDataInstance) {
                return coloredPoint;
            } else {
                return pointColor;
            }
        });
        //d3.select(this)
        //    .attr("fill", "none");
    });

    //cell.append("path")
    //    .attr("class", "voronoi-path")
    //    .attr("d", function(d) {
    //        if(d == null){
    //            return;
    //        }
    //        else{
    //            return "M" + d.join("L") + "Z";
    //        }
    //    })
    //    .attr("fill", "none")
    //    .attr("stroke", "red")//Add a color here to see the voronoi outlines
    //    .attr("pointer-events", "all")
    //    .on("mouseenter", function(d, i){
    //        if(chart.draw.showToolTip){
    //            var tipData = chart.setTipData(d, i);
    //            chart.tip.generateSimpleTip(tipData, dataTable, d3.event);
    //        }
    //        d3.select(this.previousSibling)
    //            .attr("fill", "red");
    //        //d3.select(this)
    //        //    .attr("fill", "blue");
    //    })
    //    .on("mousemove", function (d, i){
    //        if(chart.draw.showToolTip){
    //            chart.tip.hideTip();
    //        }
    //        d3.select(this.previousSibling)
    //            .attr("fill", "#04386E");
    //        if(chart.draw.showToolTip){
    //            var tipData = chart.setTipData(d, i);
    //            chart.tip.generateSimpleTip(tipData, dataTable, d3.event);
    //        }
    //        d3.select(this.previousSibling)
    //            .attr("fill", "red");
    //    })
    //    .on("mouseleave", function(d, i){
    //        if(chart.draw.showToolTip){
    //            chart.tip.hideTip();
    //        }
    //        d3.select(this.previousSibling)
    //            .attr("fill", "#04386E");
    //
    //        //d3.select(this)
    //        //    .attr("fill", "none");
    //    })

    var formatValue = d3.format(",d");
}

function getSingleAxisData(data, dataTable) {
    var chart = this,
        options = chart.options;

    var label,
        dataType,
        min,
        max,
        values = [];

    if (dataTable) {
        if (dataTable.hasOwnProperty('x')) {
            label = dataTable.x;
        }
    }

    dataType = 'NUMBER';

    for (var i = 0; i < data.length; i++) {
        values.push(data[i][dataTable.x]);
    }

    min = Math.min.apply(null, values);
    max = Math.max.apply(null, values);

    //Add a 10% buffer to both sides
    min = Math.floor(min - (max - min) * .10);
    max = Math.ceil(max + (max - min) * .10);

    //For axis min/max widget
    if (chart.options.hasOwnProperty('xMin') && chart.options.xMin != 'none') {
        min = chart.options.xMin;
    }
    if (chart.options.hasOwnProperty('xMax') && chart.options.xMax != 'none') {
        max = chart.options.xMax;
    }

    return {
        'label': label,
        'values': values,
        'dataType': dataType,
        'min': min,
        'max': max
    };
}

module.exports = jvCharts;

},{"../jvCharts.js":3}],20:[function(require,module,exports){
'use strict';

var jvCharts = require('../jvCharts.js');

jvCharts.prototype.sunburst = {
    paint: paint,
    setData: setData
};

jvCharts.prototype.generateSunburst = generateSunburst;

/************************************************ Sunburst functions ******************************************************/

/**setSunburstChartData
 *  gets sunburst data and adds it to the chart object
 *
 * @params data, dataTable, colors
 */
function setData(chart) {
    chart.data.color = chart.colors;
}

function paint(chart) {
    chart.options.color = chart.data.color;

    chart.currentData = chart.data; //Might have to move into method bc of reference/value relationship

    var sunburstMargins = {
        top: 15,
        right: 15,
        bottom: 15,
        left: 15
    };

    //Generate SVG-legend data is used to determine the size of the bottom margin (set to null for no legend)
    chart.generateSVG(null, sunburstMargins);
    // chart.generateLegend(chart.currentData.legendData, 'generateSunburst');
    chart.generateSunburst(chart.currentData);
}

/** generateSunburst
 *
 * paints the sunburst on the chart
 * @params sunburstData
 */
function generateSunburst(sunburstData) {

    var chart = this,
        svg = chart.svg,
        container = chart.config.container,
        allFilterList = [],
        relationMap = chart.data.dataTable,
        chartName = chart.config.name,
        width = container.width,
        height = container.height,
        radius = Math.min(width, height) / 2 - 10;

    chart.children = chart.data.chartData;

    var newData = JSON.parse(JSON.stringify(chart.children)); //copy of pie data

    var formatNumber = d3.format(",d");

    var x = d3.scaleLinear().range([0, 2 * Math.PI]);

    var y = d3.scaleSqrt().range([0, radius]);

    var color = d3.scaleOrdinal().range(chart.data.color.map(function (c) {
        c = d3.rgb(c);c.opacity = 1;return c;
    }));

    // var color = d3.scaleOrdinal(d3.schemeCategory10);

    var partition = d3.partition();

    var arc = d3.arc().startAngle(function (d) {
        return Math.max(0, Math.min(2 * Math.PI, x(d.x0)));
    }).endAngle(function (d) {
        return Math.max(0, Math.min(2 * Math.PI, x(d.x1)));
    }).innerRadius(function (d) {
        return Math.max(0, y(d.y0));
    }).outerRadius(function (d) {
        return Math.max(0, y(d.y1));
    });

    //  assigns the data to a hierarchy using parent-child relationships
    var root = d3.hierarchy(chart.children, function (d) {
        return d.children;
    });

    root.sum(function (d) {
        return d.value;
    });

    var vis = svg.append("g").attr("class", "sunburst").attr("width", width).attr("height", height).attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    vis.selectAll("path").data(partition(root).descendants()).enter().append("g").attr("class", "node");

    var path = vis.selectAll(".node").append("path").attr("d", arc).style("fill", function (d) {
        if (d.data.name === "root") {
            d.color = chart.options.backgroundColor;
            return chart.options.backgroundColor;
        } else {
            d.color = color(d.data.name);
            return color(d.data.name);
        }
    }).on("mouseenter", function (d, i) {
        //Get tip data
        var tipData = chart.setTipData(d, i);
        //Draw tip line
        chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
    }).on("click", click).on("mouseout", function (d) {
        chart.tip.hideTip();
    });

    if (chart.options.displayValues) {
        var text = vis.selectAll(".node").append("text").attr("transform", function (d) {
            return "rotate(" + computeTextRotation(d) + ")";
        }).attr("x", function (d) {
            return y(d.y0);
        }).attr("dx", "6") // margin
        .attr("dy", ".35em") // vertical-align
        .text(function (d) {
            return d.data.name === "root" ? "" : d.data.name;
        });
    }

    function click(d) {
        // fade out all text elements
        if (chart.options.displayValues) {
            text.transition().attr("opacity", 0);
        }

        vis.transition().duration(750).tween("scale", function () {
            var xd = d3.interpolate(x.domain(), [d.x0, d.x1]),
                yd = d3.interpolate(y.domain(), [d.y0, 1]),
                yr = d3.interpolate(y.range(), [d.y0 ? 20 : 0, radius]);

            return function (t) {
                x.domain(xd(t));y.domain(yd(t)).range(yr(t));
            };
        }).selectAll("path").attrTween("d", function (d) {
            return function () {
                return arc(d);
            };
        }).on("end", function (e, i) {
            if (chart.options.displayValues) {
                // check if the animated element's data e lies within the visible angle span given in d
                if (e.x0 > d.x0 && e.x0 < d.x1) {
                    // get a selection of the associated text element
                    var arcText = d3.select(this.parentNode).select("text");
                    // fade in the text element and recalculate positions
                    arcText.transition().duration(750).attr("opacity", 1).attr("class", "visible").attr("transform", function () {
                        return "rotate(" + computeTextRotation(e) + ")";
                    }).attr("x", function (d) {
                        return y(d.y0);
                    }).text(function (d) {
                        return d.data.name === "root" ? "" : d.data.name;
                    });
                }
            }
        });
    }

    function computeTextRotation(d) {
        return (x((d.x0 + d.x1) / 2) - Math.PI / 2) / Math.PI * 180;
    }
};

module.exports = jvCharts;

},{"../jvCharts.js":3}],21:[function(require,module,exports){
'use strict';

var jvCharts = require('../jvCharts.js');

jvCharts.prototype.treemap = {
    paint: paint,
    setData: setData
};

jvCharts.prototype.generateTreeMap = generateTreeMap;
/************************************************ TreeMap functions ******************************************************/

/**setTreeMapData
 *  gets treemap data and adds it to the chart object
 *
 * @params data, dataTable, colors
 */
function setData(chart) {
    chart.data.legendData = setTreeMapLegendData(chart.data);
    //define color object for chartData
    chart.data.color = jvCharts.setChartColors(chart.options.color, chart.data.legendData, chart.colors);
}

/**setTreeMapLegendData
 *  gets legend info from chart Data
 *
 * @params data, type
 * @returns [] of legend text
 */
function setTreeMapLegendData(data) {
    var legendArray = [];
    for (var i = 0; i < data.chartData.children.length; i++) {
        if (legendArray.indexOf(data.chartData.children[i][data.dataTable.series]) == -1) {
            legendArray.push(data.chartData.children[i][data.dataTable.series]);
        }
    }
    return legendArray;
}

function paint(chart) {
    chart.options.color = chart.data.color;

    chart.currentData = chart.data; //Might have to move into method bc of reference/value relationship

    var treeMapMargins = {
        top: 45,
        right: 50,
        left: 50,
        bottom: 130
    };

    //Generate SVG-legend data is used to determine the size of the bottom margin (set to null for no legend)
    chart.generateSVG(null, treeMapMargins);
    chart.generateLegend(chart.currentData.legendData, 'generateTreeMap');
    chart.generateTreeMap(chart.currentData);
};

/** generateTreeMap
 *
 * paints the treemap on the chart
 * @params treeMapData
 */
function generateTreeMap(treeMapData) {

    var chart = this,
        svg = chart.svg,
        colors = treeMapData.color,
        container = chart.config.container,
        allFilterList = [],
        relationMap = chart.data.dataTable,
        treemap = null,
        chartName = chart.config.name;

    chart.children = chart.data.chartData;

    var newData = JSON.parse(JSON.stringify(chart.children)); //copy of pie data

    if (!chart.options.legendHeaders) {
        chart.options.legendHeaders = legendData;
    }

    var dataHeaders = chart.options.legendHeaders;

    var legendElementToggleArray = jvCharts.getLegendElementToggleArray(dataHeaders, chart.data.legendData);

    if (legendElementToggleArray) {
        for (var j = 0; j < newData.children.length; j++) {
            for (var i = 0; i < legendElementToggleArray.length; i++) {
                if (legendElementToggleArray[i].element === newData.children[j][relationMap.series] && legendElementToggleArray[i].toggle === false) {
                    newData.children[j].show = false;
                }
            }
        }
    }

    var treeMapDataFiltered = {};
    treeMapDataFiltered["Parent"] = "Top Level";
    treeMapDataFiltered.children = [];

    for (var j = 0; j < newData.children.length; j++) {
        if (newData.children[j].show !== false) {
            treeMapDataFiltered.children.push(newData.children[j]);
        }
    }

    //  assigns the data to a hierarchy using parent-child relationships
    var root = d3.hierarchy(treeMapDataFiltered, function (d) {
        return d.children;
    });

    var treemap = d3.treemap().size([container.width, container.height]).padding(2);

    var nodes = treemap(root.sum(function (d) {
        return d[relationMap.size];
    }).sort(function (a, b) {
        return b.height - a.height || b.value - a.value;
    })).descendants();

    //Remove existing bars from page
    svg.selectAll("g.treemap").remove();
    svg.append("g").attr("class", "treemap");

    var node = svg.select(".treemap").selectAll("g").data(root.leaves()).enter().append('g').attr('transform', function (d) {
        return 'translate(0,0)';
    });

    node.append('rect')
    // .call(position)
    .attr("x", function (d) {
        return d.x0 + "px";
    }).attr("y", function (d) {
        return d.y0 + "px";
    }).attr("width", function (d) {
        return d.x1 - d.x0 + "px";
    }).attr("height", function (d) {
        return d.y1 - d.y0 + "px";
    }).attr("fill", function (d, i) {
        return jvCharts.getColors(colors, i, d.data[relationMap.series]);
    }).attr("fill-opacity", .8).attr("stroke", "#FFFFFF").attr("stroke-width", "1").on("mouseover", function (d, i) {
        //Get tip data
        var tipData = chart.setTipData(d.data, i);
        //Draw tip line
        chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);

        var rect = d3.select(this);
        rect.attr("fill", '#BBB');
        rect.transition().duration(200);
    }).on("mouseout", function (d) {
        chart.tip.hideTip();
        var rect = d3.select(this);
        rect.attr("fill", function (d, i) {
            return jvCharts.getColors(colors, i, d.data[relationMap.series]);
        });
        rect.transition().duration(200);
    });

    node.append('text')
    // .call(position)
    .attr("x", function (d) {
        return d.x0 + "px";
    }).attr("y", function (d) {
        return d.y0 + "px";
    }).attr("width", function (d) {
        return d.x1 - d.x0 + "px";
    }).attr("height", function (d) {
        return d.y1 - d.y0 + "px";
    }).attr("transform", "translate(3, 18)").text(function (d) {
        if (d.dy !== 0) {
            return d.children ? null : d.data[relationMap.label];
        }
    });
    // .on("mouseover", function (d, i) {
    //     chart.draw.tip.show({d: d, i: i}, this);
    // })
    // .on("mouseout", function (d) {
    //     chart.draw.tip.hide();
    // });


    /* Don't display text if text is wider than rect */
    var temp = svg.select(".treemap").selectAll("g").selectAll("text");
    temp.attr("style", function (d) {
        if (this.getBBox().width >= d.x1 - d.x0 - 5) {
            return "display:none";
        }
        if (this.getBBox().height >= d.y1 - d.y0 - 5) {
            return "display:none";
        }
    });
};
module.exports = jvCharts;

},{"../jvCharts.js":3}],22:[function(require,module,exports){
'use strict';

var jvCharts = require('../jvCharts.js');

jvCharts.prototype.cloud = {
    paint: paint,
    setData: setData
};

jvCharts.prototype.generateCloud = generateCloud;

/************************************************ Cloud functions ******************************************************/

/**setCloudData
 *  gets cloud data and adds it to the chart object
 *
 * @params data, dataTable, colors
 */
function setData(chart) {
    //define color object for chartData
    chart.data.color = chart.colors;
};

/**setCloudLegendData
 *  gets legend info from chart Data
 *
 * @params data, type
 * @returns [] of legend text
 */
function setCloudLegendData(data) {
    var legendArray = [];
    for (var i = 0; i < data.chartData.children.length; i++) {
        if (legendArray.indexOf(data.chartData.children[i][data.dataTable.series]) == -1) {
            legendArray.push(data.chartData.children[i][data.dataTable.series]);
        }
    }
    return legendArray;
}

function paint(chart) {
    chart.options.color = chart.data.color;
    chart.currentData = chart.data; //Might have to move into method bc of reference/value relationship

    var cloudMargins = {
        top: 15,
        right: 15,
        left: 15,
        bottom: 15
    };

    //Generate SVG-legend data is used to determine the size of the bottom margin (set to null for no legend)
    chart.generateSVG(null, cloudMargins);
    // chart.generateLegend(chart.currentData.legendData, 'generateCloud');
    chart.generateCloud(chart.currentData);
};

/** generateCloud
 *
 * paints the cloud  on the chart
 * @params cloud Data
 */
function generateCloud(cloudData) {
    var chart = this,
        svg = chart.svg,
        container = chart.config.container,
        allFilterList = [],
        relationMap = chart.data.dataTable,
        chartName = chart.config.name,
        width = container.width,
        height = container.height,
        margin = chart.config.margin,
        min,
        max;

    var categories = d3.keys(d3.nest().key(function (d) {
        if (!min && !max) {
            min = d[relationMap.value];
            max = d[relationMap.value];
        } else {
            if (d[relationMap.value] > max) {
                max = d[relationMap.value];
            }
            if (d[relationMap.value] < min) {
                min = d[relationMap.value];
            }
        }
        return d[relationMap.value];
    }).map(cloudData.chartData));

    var color = d3.scaleOrdinal().range(chart.data.color.map(function (c) {
        c = d3.rgb(c);c.opacity = 0.8;return c;
    }));

    var fontSize = d3.scalePow().exponent(5).domain([0, 1]).range([10, 80]);

    var layout = d3.layout.cloud().timeInterval(10).size([width, height]).words(cloudData.chartData).rotate(function (d) {
        return 0;
    }).font('Roboto').fontSize(function (d, i) {
        return fontSize(max - min !== 0 ? (d[relationMap.value] - min) / (max - min) : 0);
    }).text(function (d) {
        return d[relationMap.label];
    }).spiral("archimedean").on("end", draw).start();

    var wordcloud = svg.append("g").attr('class', 'wordcloud').attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    function draw(words) {
        wordcloud.selectAll("text").data(cloudData.chartData).enter().append("text").attr('class', 'word').style("font-size", function (d) {
            return d.size + "px";
        }).style("font-family", function (d) {
            return d.font;
        }).style("fill", function (d) {
            return color(d[relationMap.value]);
        }).attr("text-anchor", "middle").attr("transform", function (d) {
            return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        }).text(function (d) {
            return d.text;
        }).on("mouseover", function (d, i) {
            //Get tip data
            var tipData = chart.setTipData(d, i);
            tipData.color = color(d[relationMap.value]);

            //Draw tip
            chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
        }).on("mouseout", function (d) {
            chart.tip.hideTip();
        });
    }
};

module.exports = jvCharts;

},{"../jvCharts.js":3}]},{},[1,3,8,7,2,4,5,10,15,13,18,9,11,12,14,16,17,19,20,21,22])