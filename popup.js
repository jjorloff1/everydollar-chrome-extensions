function settingChanged() {
    var setting = this.id;
    var value = this.value;

    var settings = {};
    settings[setting] = value;

    console.log("setting the Settings: " + settings);
    chrome.storage.sync.set(settings);
}

document.addEventListener('DOMContentLoaded', function () {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var settings = ["extensionsStatus", "excludedCategories", "bankAccountName"];
        settings.forEach(function(setting) {
            console.log("setting: " + setting);

            chrome.storage.sync.get(setting, function(data) {
                console.log("setting value:" + data[setting]);
                document.getElementById(setting).disabled = false;

                if (data[setting]) {
                    document.getElementById(setting).value = data[setting];
                }
            });
        });
    });

    var extensionsStatus = document.querySelector('#extensionsStatus');
    extensionsStatus.addEventListener("change", settingChanged);

    var excludedCategories = document.querySelector('#excludedCategories');
    excludedCategories.addEventListener("change", settingChanged);

    var bankAccountName = document.querySelector('#bankAccountName');
    bankAccountName.addEventListener("change", settingChanged);
});