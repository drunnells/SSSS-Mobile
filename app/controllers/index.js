/*
 * SSSS Mobile - 2023 Dustin Runnells
 *
 * Based on the SSSS tool by B. Poettering (http://point-at-infinity.org/ssss/) using the ssss-js
 * library by Gabriel Burca (https://www.npmjs.com/package/ssss-js).
 *
 * Depends on:
 *
 * Titanium Modules:
 *   - ti.nfc - https://github.com/appcelerator-modules/ti.nfc
 *   - ti.barcode - https://github.com/appcelerator-modules/ti.barcode
 *
 * Javascript/Node:
 *   - ssss-js by Gabriel Burca - https://www.npmjs.com/package/ssss-js
 *   - bignumber.js by Michael Mclaughlin - https://travis-ci.org/github/MikeMcl/bignumber.js
 *   - qrcodejs by Shim Sangmin - https://github.com/davidshimjs/qrcodejs
 *   - JQuery - http://jquery.com (Help and QR Code view are actually Webviews)
 *   - secure-random-password - https://github.com/rackerlabs/secure-random-password#browser-support
 *
 * Icons:
 *   - Sergey Ershov - https://www.iconfinder.com/iconsets/multimedia-75
 *   - Cole Bemis - https://www.iconfinder.com/iconsets/feather-2
 *   - Paste Icon by Freepik - https://www.flaticon.com/free-icon/paste_178922
 *
 * Font:
 *   - Arimo by Steve Matteson - https://fonts.google.com/specimen/Arimo
 *
 *
 * Titanium SDK 12.1.2, ti.nfc v5.0.0, ti.barcode v6.0.1
 * Note: Remove unnecessary permissions from ti.barcode timodules.xml and comment out nfc requirement from ti.nfc timodules.xml. Needed to manually rebuild ti.nfc to get this to work.
 * Updated Note: ti.nfc v5.0.0 for Android needed NfcForegroundDispatchFilter.java updated to PendingIntent.FLAG_MUTABLE instead of FLAG_IMMUTABLE
 *
 * Google Play Package Build:
 *   appc run -p android -T dist-playstore -K <keystore> -P <keystore_password> -L ssss -O <dist_dir>
 *
 */


//
// Globals
//
// Note - I should try to rely on globals a lot less!
//
var BN = require('bignumber.js');
var ssss = require('ssss.js');

var debug = false; // Do not load external external modules, display test data. Useful for quick TiShadow runs.
var logAll = false; // Enable logging. debugLog() will call console.log() if true.

var version = Ti.App.version; // Update in custom AndroidManifest.xml AND tiapp.xml's "version".

var globalSharesArray = Array();
var copyAllLabel;
var isIos = true;
if (Ti.Platform.osname == 'android') {
	isIos = false;
}
var qrcodeHtmlFile = Ti.Filesystem.resourcesDirectory + "/qrcode.html";
var helpHtmlFile = Ti.Filesystem.resourcesDirectory + "/help.html";
var passwordHtmlFile = Ti.Filesystem.resourcesDirectory + "/generate-password.html";
var hasCamera = true;
if (debug) {
	hasCamera = false;
}
var defaultCamera;
var qrreader;
if (hasCamera) {
    qrreader = require('ti.barcode');
    qrreader.displayedMessage = 'Scan a QR Code';
    qrreader.allowMenu = false;
    qrreader.allowInstructions = false;
}
var hasNfc = false;
var nfc;
var nfcAdapter;
var emailDialog;
var secretHidden = false;

if (!debug) {
	nfc = require('ti.nfc');
    if (isIos) {
        debugLog('Creating ios nfc adapter...');
    	nfcAdapter = nfc.createNfcAdapter({
            onNdefDiscovered: handleNfcDiscoveryIos
    	});
	    if (nfcAdapter.nfcAvailable()) {
    	    debugLog('Nfc adapter available.');
	    	hasNfc = true;
    	} else {
	        debugLog('Nfc adapter NOT available.');
    	}
    }
}
var readyToWriteNfc = false;
var scannedTag = null;
var lastShareString = '';
var lastShareThreshold = '';
var lastShareShares = '';

//
// Additional View Elements
//
var splitActivityIndicator = Ti.UI.createActivityIndicator({
    style:   osIndicatorStyle(),
    height:  Ti.UI.FILL,
    width:  "50dp",
});
var combineActivityIndicator = Ti.UI.createActivityIndicator({
    style:   osIndicatorStyle(),
    height:  Ti.UI.FILL,
    width:  "50dp",
});

//
// Listeners
//
$.secretToolsBtn.addEventListener('click',function() {
    debugLog('Open secret options');
    hideKeyboard();
    $.secretToolsView.show();
});

$.secretCopyBtn.addEventListener('click',function() {
    debugLog('Copy SM');
    //hideKeyboard();
    Ti.UI.Clipboard.setText($.textInputFieldSM.value);
    toastMessage("Coppied");
});

$.secretToolsGenerateBtn.addEventListener('click',function() {
    debugLog('Generate Secret');
    if (generateSecret()) {
        hideKeyboard();
        $.secretToolsView.hide();
    }
});

$.secretToolsCancelBtn.addEventListener('click',function() {
    debugLog('Cancel secret tools');
    hideKeyboard();
    $.secretToolsView.hide();
});

$.secretVisBtn.addEventListener('click',function() {
    debugLog('Change Password Mask');
    hiddenSecretSwap();
});

$.hiddenText.addEventListener('click',function() {
    $.textInputFieldSM.focus();
});

$.textInputFieldSM.addEventListener('change',function() {
    addHideCharacters();
});

$.splitTab.addEventListener('selected',function() {
    closeHelp();
});

$.combineTab.addEventListener('selected',function() {
    closeHelp();
});

Ti.App.addEventListener('webviewOpenURL', function(e) {
        Ti.Platform.openURL(e.url);
});

$.splitHelpBtn.addEventListener('click',function() {
    openHelp();
});

$.combineHelpBtn.addEventListener('click',function() {
    openHelp();
});

$.splitShareNfcBtn.addEventListener('click',function() {
    androidWriteNfc();
});

$.scanNfcBox.addEventListener('click',function() {
	androidNfcBox('close');
});

$.writeNfcBox.addEventListener('click',function() {
	androidNfcWriteBox('close');
});

$.combinedIconCopy.addEventListener('click', function() {
    if ($.combineResultValue.text && ($.combineResultValue.text.length > 0)) {
        Ti.UI.Clipboard.setText($.combineResultValue.text);
    }
    toastMessage("Coppied");
});

$.splitBoxTitle.addEventListener('click', function() {
    hideKeyboard();
});

$.combineBoxTitle.addEventListener('click', function() {
    hideKeyboard();
});

$.scanIconQr.addEventListener('click', function() {
    if (debug) {
        alert('Scan QR');
    } else {
    	debugLog('QR SCAN!');
        doQrScan();
    }
});

$.scanIconNfc.addEventListener('click', function() {
    if (debug) {
        alert("Scan NFC");
    } else {
    	debugLog('NFC SCAN!');
	    if (hasNfc) {
    		doNfcScan();
    	} else {
	    	alert('NFC is not supported on this device!');
    	}
    }
});

$.scanIconPaste.addEventListener('click', function() {
    debugLog('Paste');
    var toPaste = Ti.UI.Clipboard.getText();
    if (toPaste) {
        addCombineText(toPaste);
    } else {
        toastMessage("Nothing To Paste");
    }
});

$.scanIconTrash.addEventListener('click', function() {
    $.textAreaCombine.value = "";
    $.combineResultValue.text = "";
});

$.splitShareDoneBtn.addEventListener('click', function() {
    lastShareString = "";
    lastShareThreshold = "";
    lastShareShares = "";
    $.splitShareView.hide();
});

$.splitShareEmailBtn.addEventListener('click', function() {
    debugLog('Sending share email.');
    emailShare();
});

$.splitBtn.addEventListener('click', function() {
    splitActivityIndicator.show();
    setTimeout(function(){
    	var splitResultValue;
        var allSharesStr = "";
        var secretMessage   = $.textInputFieldSM.value;
        var threshold       = parseInt($.textInputFieldThreshold.value);
        var token           = $.textInputFieldToken.value;
        var shares          = parseInt($.textInputFieldShares.value);
	    hideKeyboard();
    	removeAllShareResults();
	    if (copyAllLabel) {
    	   $.boxSplitResults.remove(copyAllLabel);
	    }
    	if (!validateShareForm()) {
        	$.boxSplitResults.opacity = 0;
            splitActivityIndicator.hide();
    	    return false;
	    }
    	if (debug) {
	    	splitResultValue = secretMessage;
            var i;
	    	for (i=0; i < shares; i++) {
		        var testResult = "TEST" + i + ": " + splitResultValue;
                var iColor = "#fff";
                if ( (i+1) % 2 == 0) {
                    iColor = "#eee";
                }
        	    addShareResult(testResult,threshold,shares,iColor);
            	allSharesStr += testResult + "\n";
	    	}
    	} else {
 	    	splitResultValue = doSplit(threshold,shares,secretMessage,token);
            allSharesStr = splitResultValue;
    		var resultsArray = splitResultValue.split("\n");
	    	var i;
	    	var iCount = 0;
    		for (i in resultsArray) {
                var iColor = "#fff";
                if ( (iCount+1) % 2 == 0) {
                    iColor = "#eee";
                }
            	addShareResult(resultsArray[i],threshold,shares,iColor);
            	iCount++;
		    }
    	}
	    copyAllLabel = Ti.UI.createLabel({
            text: "Copy All",
            width: "100%",
            textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER,
            color: "#8888ff",
	    });
    	$.boxSplitResults.add(copyAllLabel);
	    copyAllLabel.addEventListener('click', function() {
            Ti.UI.Clipboard.setText(allSharesStr);
            toastMessage("Coppied");
	    });
    	$.boxSplitResults.opacity = 1;
        splitActivityIndicator.hide();
    }, 1000);
});

$.combineBtn.addEventListener('click', function() {
    combineActivityIndicator.show();
    setTimeout(function(){
        var textAreaCombineValue = $.textAreaCombine.value;
        var resultText = "";
    	hideKeyboard();
        if (!textAreaCombineValue) {
            alert("You have not entered any valid shares to combine.");
            combineActivityIndicator.hide();
            return false;
        }
        var keysArray = textAreaCombineValue.split("\n");
        var cleanKeysArray = Array();
        var i;
        for (i in keysArray) {
            if (keysArray[i]) {
                var tempKey = keysArray[i].trim();
                if (tempKey && (tempKey.length > 0)) {
                    cleanKeysArray.push(keysArray[i].trim());
                }
            }
        }
    	if (debug) {
            resultText = "TEST: " + cleanKeysArray;
    	} else {
            resultText = doCombine(cleanKeysArray);
    	}
        if (resultText) {
            $.combineResultValue.text = resultText;
        	$.boxCombineResults.opacity = 1;
        }
        combineActivityIndicator.hide();
    }, 1000);
});

//
// Main
//

$.index.open();
$.boxSplitResults.opacity = 0;
$.boxCombineResults.opacity = 0;
$.scanNfcBox.hide();
$.writeNfcBox.hide();
$.splitHelpView.hide();
$.combineHelpView.hide();
$.splitShareView.hide();
$.combineOverlayView.hide();
$.secretToolsView.hide();
$.winSplit.add(splitActivityIndicator);
$.winCombine.add(combineActivityIndicator);
$.splitShareQrCodeView.url = qrcodeHtmlFile;
$.splitHelpWebview.url = helpHtmlFile;
$.combineHelpWebview.url = helpHtmlFile;
$.passwordWebview.url = passwordHtmlFile;

if (isIos) {
    $.shareActionButtons.remove($.splitShareNfcBtn);
} else {
    if (!debug) {
        setTimeout(function(){
            startAndroidNfc();
            if (!hasNfc) {
                $.shareActionButtons.remove($.splitShareNfcBtn);
            }
    	},500);
    }
}
setTimeout(function() {
    permReqCam();
    setupQrCodeReader();
},1000);


//
// Functions
//

// SSSS Split
function addHideCharacters() {
    $.hiddenText.text = " ";
    for (lCount = 0; lCount < $.textInputFieldSM.value.length; lCount++) {
        if (lCount < 15) {
            $.hiddenText.text += '●';
        }
    }
}

function generateSecret() {
    var errorsArray = Array();
    var smToolsLength = $.smToolsLength.value;
    var smToolsNumbers = $.smToolsNumbers.value;
    var smToolsSymbols = $.smToolsSymbols.value;
    var smToolsLowercase = $.smToolsLowercase.value;
    var smToolsUppercase = $.smToolsUppercase.value;
    var smToolsSimilarCharacters = $.smToolsSimilarCharacters.value;

    if (smToolsLength < 5) {
        errorsArray.push("Generated string must be longer than 4 characters.");
    }
    if (smToolsLength > 128) {
        errorsArray.push("Generated string must be less than 128 characters.");
    }
    if ((!smToolsNumbers) && (!smToolsSymbols) && (!smToolsLowercase) && (!smToolsUppercase)) {
        errorsArray.push("Generated string contain at least numbers, symbols, lowercase letters or uppercase letters.");
    }

    if (errorsArray.length > 0) {
        errorString = "Please correct:\n";
        var i;
        for (i in errorsArray) {
            errorString += "* " + errorsArray[i] + "\n";
        }
        alert(errorString);
        return false;
    }

    var smToolsOptions = {
            length: smToolsLength,
            numbers: smToolsNumbers,
            symbols: smToolsSymbols,
            lowercase: smToolsLowercase,
            uppercase: smToolsUppercase,
            excludeSimilarCharacters: smToolsSimilarCharacters,
    };
    var generatedString = $.passwordWebview.evalJS('getRandomPassword(' + JSON.stringify(smToolsOptions) + ')');

    if (generatedString) {
            debugLog("Generated String: " + generatedString);
            $.textInputFieldSM.value = generatedString;
            addHideCharacters();
            return true;
    } else {
            alert("Unable to generate secret string!");
            return false;
    }
}

function hiddenSecretSwap() {
    if (secretHidden) {
        secretHidden = false;
        $.secretVisBtn.image = '/icon_eye.png';
        debugLog('Eye Open');
        $.hiddenText.hide();
        $.textInputFieldSM.show();
    } else {
        secretHidden = true;
        $.secretVisBtn.image = '/icon_eye_closed.png';
        debugLog('Eye Closed');
        $.hiddenText.show();
        $.textInputFieldSM.hide();
    }
}

function doSplit(threshold,numShares,secret,token) {
	var toReturn = false;
	//var secret    = 'This is test string #2.';
	var hexInput  = false;

	debugLog("Processing Split:");
	debugLog(" Threshold:" + threshold);
	debugLog(" Shares:" + numShares);
	debugLog(" Secret:" + secret);
	debugLog(" Token:" + token);

	try {
		var s = new ssss.SSSS(parseInt(threshold), parseInt(numShares), hexInput);
		debugLog("RESULT:");
		debugLog(s);
		var keys = s.split(secret, token);
		debugLog(keys);
		var something = keys.join("\n");
		//var something = keys.slice(0, threshold).join("\n");
		debugLog(something);
		toReturn = something;
	} catch (e) {
		alert(e);
		console.error(e);
	}
	return toReturn;
}

// SSSS Combine
function doCombine(keys) {
	var toReturn = false;
	try {
		var hexOutput = false;
        var s = new ssss.SSSS(keys.length, 0, hexOutput);
        var secret = s.combine(keys);
        debugLog('SECRET: ' + secret);
        toReturn = secret;
        if (!toReturn) {
    	   alert("Error: Unable to combine shares! Please confirm that you have entered the exact number of shares required by the threshold for this set.");
        }
	} catch (e) {
	    alert(e);
        console.error("Error: " + e);
	} finally {
	}
	return toReturn;
}

// Hide keyboard
function hideKeyboard() {
	debugLog("Hiding keyboard");
	$.textInputFieldSM.blur();
	$.textInputFieldThreshold.blur();
	$.textInputFieldShares.blur();
	$.textInputFieldToken.blur();
	$.textAreaCombine.blur();
}

// Clear previous array of generated shares
function removeAllShareResults() {
    var i;
    for (i in globalSharesArray) {
        debugLog('Removing share ' + i);
        $.boxSplitResults.remove(globalSharesArray[i]);
    }
    globalSharesArray = Array();
}

// Add a generated share to the shares array for later printing
function addShareResult(shareString,shareThreshold,shareShares,bgcolor) {
    var shareOn = globalSharesArray.length;
    debugLog('Adding share ' + shareOn);
    globalSharesArray[shareOn] = Ti.UI.createView({
        width: "100%",
        height: Ti.UI.SIZE,
    	bubbleParent: true,
    	backgroundColor: bgcolor,
    });

    var tempContainer = Ti.UI.createView({
        width: "100%",
        height: Ti.UI.SIZE,
    	bubbleParent: true,
    });

    var tempCopyButton = Ti.UI.createImageView();
    $.addClass(tempCopyButton,'copyButton');

    var tempShareButton = Ti.UI.createImageView();
    $.addClass(tempShareButton,'shareButton');

    tempCopyButton.addEventListener('click', function() {
        Ti.UI.Clipboard.setText(shareString);
        toastMessage("Coppied");
    });

    tempShareButton.addEventListener('click', function() {
        $.splitShareText.text = shareString;
        $.splitShareQrCodeView.evalJS("makeCode('" + shareString + "');");
        lastShareString = shareString;
        lastShareThreshold = shareThreshold;
        lastShareShares = shareShares;
        $.splitShareView.show();
    });

    tempContainer.add(Ti.UI.createLabel({
        text: shareString,
        width: "73%",
        textAlign: Ti.UI.TEXT_ALIGNMENT_LEFT,
        left: 0,
        top:0,
        color: "#000",
    }));
    tempContainer.add(tempCopyButton);
    tempContainer.add(tempShareButton);
    globalSharesArray[shareOn].add(tempContainer);
    $.addClass(globalSharesArray[shareOn],'splitResultStringBox');
	$.boxSplitResults.add(globalSharesArray[shareOn]);
	debugLog('Share list complete');
}

// Alert message if user has entered invalid parameters
function validateShareForm() {
    var toReturn = false;
    var errorsArray = Array();
    var errorString = "";
    var validLetters = /^[A-Za-z]+$/;
    debugLog("INPUT Secret Message: " + $.textInputFieldSM.value);
    debugLog("INPUT Threshold: " + $.textInputFieldThreshold.value);
    debugLog("INPUT Shares: " + parseInt($.textInputFieldShares.value));
    debugLog("INPUT Token: " + parseInt($.textInputFieldToken.value));
    if ($.textInputFieldSM.value.length < 1) { errorsArray.push("Missing secret message."); }
    if ($.textInputFieldSM.value.length > 128) { errorsArray.push("Secret message must be less than 128 characters long."); }
    if ($.textInputFieldThreshold.value < 2) { errorsArray.push("Threshold must be greater than 1."); }
    if (parseInt($.textInputFieldShares.value) < 2) { errorsArray.push("Number of shares must be greater than 1."); }
    if (parseInt($.textInputFieldShares.value) > 50) { errorsArray.push("Number of shares must be less than 50."); }
    if (parseInt($.textInputFieldThreshold.value) > parseInt($.textInputFieldShares.value)) { errorsArray.push("Threshold can not be greater than the total number of shares."); }
    if ($.textInputFieldToken.value.length > 128) { errorsArray.push("Token must be less than 128 characters long."); }
    if ($.textInputFieldToken.value.length > 0) {
        var tokenStr = $.textInputFieldToken.value.trim();
        var testRegex = /^[A-Za-z0-9_]+$/
        if (!testRegex.test(tokenStr)) {
            errorsArray.push("* Token may contain only letters, numbers and underscores.");
        }
    }
    if (errorsArray.length > 0) {
        errorString = "Please correct:\n";
        var i;
        for (i in errorsArray) {
            errorString += "* " + errorsArray[i] + "\n";
        }
        alert(errorString);
    } else {
        toReturn = true;
    }
    return toReturn;
}

// Determine activity indicator based on OS
function osIndicatorStyle() {
    var style = Ti.UI.ActivityIndicatorStyle.PLAIN;
    if (isIos) {
        style = Ti.UI.ActivityIndicatorStyle.DARK;
    }
    return style;
}

//
// iOS doesn't do Toast messages, this is close. Based on:
// http://blog.christian-baer.com/index.php/titanium-android-toast-like-notifications-in-iphone/#content
//
function toastMessage(customMessage) {
    var interval = 1000;
    if (isIos) {
        // window container
        indWin = Titanium.UI.createWindow();

        //  view
        var indView = Titanium.UI.createView({bottom:50,height:30,width:250,borderRadius:10,backgroundColor:'#888',opacity:.9});

        indWin.add(indView);

        // message
        var message = Titanium.UI.createLabel({
            text: customMessage && typeof(customMessage!=='undefined') ? customMessage : L('please_wait'),
            color:'#fff',width:'auto',height:'auto',textAlign:'center',
            font:{fontSize:14,fontWeight:'bold'}});

            indView.add(message);
            indWin.open();

            interval = interval ? interval : 2500;
            setTimeout(function(){
                indWin.close({opacity:0,duration:1000});
            },interval);
    } else {
        var toast = Ti.UI.createNotification({
            message: customMessage,
            duration: Ti.UI.NOTIFICATION_DURATION_LONG
        });
        toast.show();
    }
}

// Setup QR Code reader
function setupQrCodeReader() {
	if (hasCamera) {
        qrreader.addEventListener('success',function(e) {
            debugLog("SCAN RESULTS: " + e.result);
            addCombineText(e.result);
            $.combineOverlayView.hide();
        });
        qrreader.addEventListener('error',function(e) {
            $.combineOverlayView.hide();
            alert('Error reading QR Code!');
        });
    }

	if (debug || Ti.Media.hasCameraPermissions()) {
		var cameras = Ti.Media.availableCameras;
		var camerasArray = Array();
		for (var c=0; c < cameras.length; c++) {
		    if (cameras[c] == Ti.Media.CAMERA_REAR) {
		        debugLog('Found REAR camera!');
		        camerasArray.push('rear');
		        defaultCamera = 'rear';
		    }
		    if (cameras[c] == Ti.Media.CAMERA_FRONT) {
		        debugLog('Found FRONT camera!');
		        camerasArray.push('front');
		        if (defaultCamera == '') {
		            defaultCamera = 'front';
		        }
		    }
		}
		debugLog('CAMERAS: ' + JSON.stringify(cameras));
	}

	debugLog('DEFAULT CAMERA: ' + defaultCamera);
}

// Request camera permissions
function permReqCam() {
	if (debug || Ti.Media.hasCameraPermissions()) {
	    debugLog("App already has camera permission");
	} else {
	    debugLog("Requesting camera permission");
	    Ti.Media.requestCameraPermissions(function(e) {
	             if (e.success === true) {
                    setupQrCodeReader();
	             } else {
	                 alert("QR code scanning disabled due to camera access error: " + e.error);
	                 hasCamera = false;
	             }
	    });
	}
}

// QR Code scan
function doQrScan() {
    if (!hasCamera) {
        alert('QR scanning is not supported on this device! Has camera access been disabled?');
		return false;
	}
    $.combineOverlayView.show();

    var qrOverlayView = Ti.UI.createView({
        width: "100%",
        height: "100%",
    });
    var qrCancelButton = Ti.UI.createButton({
		title : "close",
		bottom : 50,
	});
    qrCancelButton.addEventListener('click', function() {
        qrreader.cancel();
        $.combineOverlayView.hide();
    });

	qrOverlayView.add(qrCancelButton);

   try {
        qrreader.capture({
	    	showCancel:false,
            showRectangle:true,
    		animate: true,
	    	allowRotation: true,
		    acceptedFormats: [ qrreader.FORMAT_QR_CODE ],
    		overlay: qrOverlayView,
	    });
        qrreader.useLED = false;
   } catch(e) {
       // Do nothing
   }
}

// NFC scan
function doNfcScan() {
	if (isIos) {
		nfcAdapter.begin();
	} else {
		androidNfcBox('open');
	}
}

// Android's foreground dispatch is always listening, emulate iOS behavior by showing instruction box (WRITE)
function androidNfcWriteBox(state) {
	debugLog('NFC WRITE BOX STATE CHANGE: ' + state);
	if (state == 'open') {
		$.writeNfcBox.show();
		restartAndroidForegroundDispatch();
	} else {
		$.writeNfcBox.hide();
        readyToWriteNfc = false;
        lastShareString = '';
        lastShareThreshold = '';
        lastShareShares = '';
	}
}

// Android's foreground dispatch is always listening, emulate iOS behavior by showing instruction box (READ)
function androidNfcBox(state) {
	debugLog('NFC BOX STATE CHANGE: ' + state);
	if (state == 'open') {
		$.scanNfcBox.show();
				restartAndroidForegroundDispatch();
        readyToWriteNfc = false;
	} else {
		$.scanNfcBox.hide();
        readyToWriteNfc = false;
	}
}

function restartAndroidForegroundDispatch() {
	  	try {
	  	 	nfcAdapter.enableForegroundDispatch(dispatchFilter);
				debugLog('FOREGROUND DISPATCHER ENABLED...');
	  	} catch (e) {
	 			debugLog('CAUGHT: Not able to enable foreground dispatch.');
	 	 }
}

// ANDROID - If android has read a tag without NDEF data, do nothing on read, but do write if in write mode
function handleNonNdef(e) {
	debugLog('Non-NDEF Match');
    if (readyToWriteNfc) {
        debugLog('NFC ready to write');
        scannedTag = e.tag;
        debugLog(scannedTag);
        if (scannedTag.techList.indexOf(nfc.TECH_NDEF) >= 0) {
            debugLog('NDEF on tag looks writable');
            doAndroidNfcWrite();
        } else {
            debugLog('NDEF on tag DOES NOT look writable');
            alert('This tag does not look like a writable format!');
            androidNfcWriteBox('close');
        }
    } else {
        alert('Unable to read NDEF data from this tag!');
        androidNfcBox('close');
    }
	debugLog(e);
}

// ANDROID - Read NFC tag if NDEF available, do write if in write mode
function handleNfcDiscoveryAndroid(e) {
	debugLog('Discovery Handler');
	if (typeof e.messages != 'undefined') {
		if (typeof e.messages[0] != 'undefined') {
			if (typeof e.messages[0].records != 'undefined') {
				if (typeof e.messages[0].records[0] != 'undefined') {
				    debugLog('TEST:');
				    debugLog( e.messages[0].records[0] );
					if (readyToWriteNfc) {
					    debugLog('NFC ready to write');
					    scannedTag = e.tag;
					    debugLog(scannedTag);
					    if (scannedTag.techList.indexOf(nfc.TECH_NDEF) >= 0) {
					        debugLog('NDEF on tag looks writable');
					        doAndroidNfcWrite();
					    } else {
					        debugLog('NDEF on tag DOES NOT look writable');
					        alert('This tag does not look like a writable format!');
					    }
					} else {
					    debugLog('NFC ready to read');
    					if (typeof e.messages[0].records[0].text != 'undefined') {
	    					processNfc(e.messages[0].records[0].text);
		    			}
					}
				}
			}
		}
	}
	androidNfcBox('close');
	androidNfcWriteBox('close');
}

// IOS - Do NFC read on ios
function handleNfcDiscoveryIos(e) {
  var data = [];
  debugLog(JSON.stringify(e.arrContentData));
  if(e.arrContentData){
  	var type = 'text';

    var tempObj = JSON.parse(JSON.stringify(e.arrContentData));
    var typeStr = tempObj[0].typeFromNDEFData;
    var message = tempObj[0].NDEFConvertedCompleteString;
    var fromData = tempObj[0].NDEFContentFromData;

    debugLog("typeStr: " + typeStr);
    debugLog("message: " + message);
    debugLog("fromData: " + fromData);

    if (message.length > 3) {
       	message = message.substr(3,message.length - 3); // Unicode SOH Character?
    	debugLog('FIXED MESSAGE: ' + message);
        processNfc(message);
    }
  }
  nfcAdapter.invalidate(); // This is required for iOS only. Use "invalidate()" to invalidate a session.
}

// Process NDEF message
function processNfc(message) {
    debugLog('Process NFC message: ' + message);
    addCombineText(message);
}

// ANDROID - start NFC foreground dispatch
function startAndroidNfc() {
	debugLog('Starting Android NFC..');
	nfcAdapter = nfc.createNfcAdapter({
		onNdefDiscovered: handleNfcDiscoveryAndroid,
		onTagDiscovered: handleNonNdef,
		onTechDiscovered: handleNonNdef
	});

	dispatchFilter = nfc.createNfcForegroundDispatchFilter({
		intentFilters: [
			{ action: nfc.ACTION_NDEF_DISCOVERED, mimeType: 'text/plain' }
		],
		techLists: [
			[ "android.nfc.tech.NfcF", "android.nfc.tech.NfcA", "android.nfc.Ndef" ],
			[ "android.nfc.tech.Ndef" ],
			[ "android.nfc.tech.MifareClassic" ],
			[ "android.nfc.tech.NfcA" ]
		]
	});
	debugLog('Created dispatchFilter..');
	if (!nfcAdapter.isEnabled()) {
		debugLog('NFC NOT Enabled..');
	} else {
		debugLog('NFC Enabled..');
		hasNfc = true;
		var act = Ti.Android.currentActivity;
		debugLog('Adding INTENT listener...');
		act.addEventListener('newintent', function(e) {
			debugLog('NEW INTENT');
	    nfcAdapter.onNewIntent(e.intent);
		});
		debugLog('Adding RESUME listener...');
		act.addEventListener('resume', function(e) {
			debugLog('RESUME');
		    try {
			    nfcAdapter.enableForegroundDispatch(dispatchFilter);
		    } catch (e) {
		    	debugLog('CAUGHT: Not able to enable foreground dispatch on RESUME.');
		    }
		});
		debugLog('Adding PAUSE listener...');
		act.addEventListener('pause', function(e) {
			debugLog('PAUSE');
		    try {
			    nfcAdapter.disableForegroundDispatch();
		    } catch (e) {
		    	debugLog('CAUGHT: Not able to disable foreground dispatch.');
		    }
		});
		debugLog('Adding FOREGROUND DISPATCHER...');
	  try {
	   	nfcAdapter.enableForegroundDispatch(dispatchFilter);
			debugLog('FOREGROUND DISPATCHER ADDED...');
	  } catch (e) {
	 		debugLog('CAUGHT: Not able to enable foreground dispatch.');
	  }
	}
}

// Add text to combine box on Combine tab
function addCombineText(inText) {
    if ($.textAreaCombine.value.indexOf(inText) == -1) {
        $.textAreaCombine.value += inText + "\n";
    }
}

// ANDROID - Enter NFC write mode and show instruction box
function androidWriteNfc() {
    debugLog('Write NFC!');
    readyToWriteNfc = true;
	androidNfcWriteBox('open');
}

// ANDROID - Write to NFC tag
function doAndroidNfcWrite() {
    var tech = nfc.createTagTechnologyNdef({
        tag: scannedTag
    });

    // We checked when the tag was scanned that it supported the necessary tag type (Ndef in this case).
    if (!tech.isValid()) {
        alert("Failed to create Ndef tag type");
    	androidNfcWriteBox('close');
        return;
    }

    // Attempt to write an Ndef record to the tag
    try {
        tech.connect();

        // It's possible that the tag is not writable, so we need to check first.
        if (!tech.isWritable()) {
            androidNfcWriteBox('close');
            alert ("Tag is not writable");
        } else {
            // Create a new message to write to the tag
            var date = new Date();
            var textRecord = nfc.createNdefRecordText({
                text: lastShareString,
            });
            var msg = nfc.createNdefMessage({
                records: [ textRecord ]
            });

            // For good measure, confirm that the message is not too big for the tag
            var blob = msg.toByte();
            if (blob.length > tech.getMaxSize()) {
                alert("Tag capacity is " + tech.getMaxSize() + ", but message size is " + blob.length);
            } else {
                // Write to the tag
                tech.writeNdefMessage(msg);
                toastMessage("Tag Updated");
                //onClear();
            }
        }
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        if (tech.isConnected()) {
            tech.close();
        }
    }
    androidNfcWriteBox('close');
}

// Open help webview
function openHelp() {
    $.splitHelpWebview.evalJS("setVersion('v" + version + "');");
    $.combineHelpWebview.evalJS("setVersion('v" + version + "');");
    $.splitHelpView.show();
    $.combineHelpView.show();
}

// Close help webview
function closeHelp() {
    $.splitHelpView.hide();
    $.combineHelpView.hide();
}

// Share QR Code via Email. For some reason emailDialog was causing crash on slower Android devices. Added delays for each step.
function emailShare() {
    $.splitShareQrCodeView.toImage(function(imageBlob) {
        setTimeout(function(){
            debugLog('EMAIL: Creating Email Dialog');
            emailDialog = Ti.UI.createEmailDialog();
        },200);
        setTimeout(function(){
            debugLog('EMAIL: Setting Subject');
            emailDialog.subject = "SSSS Share";
        },400);
        setTimeout(function(){
            debugLog('EMAIL: Setting Message');
            emailDialog.messageBody = 'Please find the below SSSS share that I have generated for you. Note that original message can only be reassembled with exactly ' + lastShareThreshold + ' shares (including this one). The SSSS Mobile app (http://ssssmobile.app) for iOS and Android, or any application compatible with B. Poettering\'s SSSS tool, can be used to combine the required shares.\n\nTotal Shares: ' + lastShareShares + '\nThreshold: ' + lastShareThreshold + '\nThis Share: ' + lastShareString;
        },600);
        setTimeout(function(){
            debugLog('EMAIL: Adding Attachment');
            emailDialog.addAttachment(imageBlob);
        },800);
        setTimeout(function(){
            debugLog('EMAIL: Opening');
            emailDialog.open();
        },1000);
    });
}

// If logAll is true, do console.logs
function debugLog(logText) {
    if (logAll) {
        console.log(logText);
    }
}
