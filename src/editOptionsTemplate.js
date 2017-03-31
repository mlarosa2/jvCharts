var html = `<!--Top title bar of edit popup-->
<div class='title'>
    <div class="inline">
        <b>Edit Options<div id="edit-option-element" class="inline" style="visibility: hidden;"></div>:</b>
    </div>

    <div id='exitEditMode' class='pull-right sm-neg-top-margin pointer'>
        <i class='fa fa-times'></i>
    </div>
</div>

<!--Line dividing top bar with form options below-->
<hr style='margin:3px 0 3px 0;'/>

<!--Form Options-->
<div id="form'+chart.config.name+'">

    <!--Number formatting options-->
    <div class="grid12 editable-num-format" style="display: none;">
        <div class="inline sm-btm-margin">Number Format:
            <select id="editable-num-format">
                <option value="">--Select Option--</option>
                <option value="currency">Currency</option>
                <option value="fixedCurrency">Fixed Point Currency</option>
                <option value="percent">Percent</option>
                <option value="millions">Millions</option>
                <option value="commas">Commas</option>
                <option value="none">None</option>
            </select>
        </div>
        <br/>
    </div>

    <!--Text formatting options-->
    <div class="editable-text-size-buttons inline center topBarOption increasefont pointer" style="display: none;">
        <button id='decreaseFontSize' title='Decrease the font size' class='topbar-button font btn-light pointer no-box-shadow'><i class='fa fa-font'></i><i class='fa fa-long-arrow-down'></i></button>
        <button id='increaseFontSize' title='Increase the font size' class='topbar-button font btn-light pointer no-box-shadow'><i class='fa fa-font'></i><i class='fa fa-long-arrow-up'></i></button>
    </div>


    <div class="grid12 editable-text-color" style="display: none;">
        <div class="inline sm-btm-margin">Text Color:
            <input type="color" id="editable-text-color" value="#000000">
        </div>
        <br/>
    </div>

    <div class="grid12 editable-text-size" style="display: none;">
        <div class="inline sm-btm-margin">Text Size:
            <input type="number" id="editable-text-size" min="0" max="30" value="12">
        </div>
        <br/>
    </div>

    <div class="grid12 editable-content" style="display: none;">
        <div class="inline sm-btm-margin">Text:
            <input type="text" id="editable-content" placeholder="Enter text here">
        </div>
        <br/>
    </div>

    <!--bar chart formatting-->
    <div class="grid12 editable-bar" style="display: none;">
        <div class="inline sm-btm-margin">Bar Color:
            <input type="color" id="editable-bar" value="#aaaaaa">
        </div>
        <br/>
    </div>

    <!--pie chart formatting-->
    <div class="grid12 editable-pie" style="display: none;">
        <div class="inline sm-btm-margin">Pie Slice Color:
            <input type="color" id="editable-pie" value="#aaaaaa">
        </div>
        <br/>
    </div>

    <!--scatter plot formatting-->
    <div class="grid12 editable-scatter" style="display: none;">
        <div class="inline sm-btm-margin">Scatter Circle Color:
            <input type="color" id="editable-scatter" value="#aaaaaa">
        </div>
        <br/>
    </div>

    <!--Submit button-->
    <div class="editable-default-and-apply">
        <button id="submitEditModeDefault" class="sm-btn btn-light pull-left">Default</button>
        <button id="submitEditMode" class="sm-btn btn-green pull-right">Apply</button>
    </div>
</div>`;

module.exports = html;