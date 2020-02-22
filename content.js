console.log("Running Content Script.");

// TODO:
// * Provide the name of bank account in extension panel config panel
// * trigger automatically on appropriate changes to DOM
// * dynamically exclude categories or budget items (Emergency Fund, or all of Savings)
// * trigger when clicking budget navbar after leaving
// * Don't trigger for past or future months

var elementExistsOnPage = function (elementFunction) {
    var element = elementFunction();
    if (element == null || (element instanceof NodeList && element.length == 0)) {
        return false;
    }

    return true;
};

/* This is a timer method to trigger functions once an element has actually loaded on screen */
var executeAfterElementLoaded = function(elementFunction, callback, wait_time = 100) {
    console.log("Waiting for element to load.");
    var checkExist = setInterval(function () {
        console.log("Checking if element exists.");

        if (!!elementExistsOnPage(elementFunction)) {
            console.log("Element exists! Executing function.");
            clearInterval(checkExist);

            callback();
        }
    }, wait_time);
};


var openBankAccountPanel = function () {
    console.log("Opening accounts modal invisibly.");
    document.querySelector("#IconTray_accounts").click();
};

var closeBankAccountPanel = function () {
    console.log("Closing accounts modal.");
    document.querySelector("#Modal_close").click();
};

var convertMoneyStringToNumber = function(moneyString) {
    return moneyString.replace('$', '').replace(',', '');
};

var bankAccountElements = function() {
    return document.querySelectorAll(".BankAccount");
};

var retreiveAccountBalance = function (accountName) {
    console.log("Retrieving account balance for account: " + accountName);
    var bankElements = bankAccountElements();

    console.log(bankElements);

    var accountBalance = 0.00;
    bankElements.forEach(function(item) {
        var itemAccountName = item.querySelector(".BankAccount-name").innerText;
        console.log("Account Name: " + itemAccountName);

        if (accountName == itemAccountName) {
            var accountBalanceString = item.querySelector(".BankAccount-balance .money").dataset.text;
            console.log("Account " + accountName + " balance is " + accountBalanceString);
            accountBalance += convertMoneyStringToNumber(accountBalanceString);
        }
    });

    return accountBalance;
};



var colorCodeBankAccountBalanceCalculation = function (balance) {
    console.log("Color coding the account balance calculation.");

    var cssRuleIndex = document.styleSheets[1].insertRule(".ReactModalPortal { display: none !important; }");
    openBankAccountPanel();

    executeAfterElementLoaded(bankAccountElements, function() {
        var accountBalance = retreiveAccountBalance("Interest Checking");

        if (balance > accountBalance) {
            console.log("Account balance too low for budget.  Danger.");
            document.querySelector(".extensions-AccountBalance .BudgetOverviewList-value").setAttribute("style", "color: red;");
        } else {
            console.log("Account balance sufficient for budget.  All Good.");
        }

        closeBankAccountPanel();
        document.styleSheets[1].deleteRule(cssRuleIndex);
    }, 5);
};


var calculateBankBalance = function () {
    var sum = 0.00;
    var allValues = document.querySelectorAll(".money--remaining");
    allValues.forEach(function (item) {
        var value = convertMoneyStringToNumber(item.dataset.text)
        sum += parseFloat(value) * 100;
    });
    return (sum - 1500000) / 100;
};

var budgetPageElement = function () {
    return document.querySelector(".Budget-groupsList");
};

var budgetPageLoaded = function () {
    return !!budgetPageElement();
};

var swappableColumnElements = function () {
    return document.querySelectorAll(".BudgetItemRow-swappableColumn");
};

var remainingValuesDisplayed = function () {
    return !!document.querySelector(".money--remaining");
};

var connectedBankAccountBalanceDisplayed = function () {
    return !!document.querySelector(".BankAccount-balance .money");
};

var accountBalanceElement = function () {
    return document.querySelector(".extensions-AccountBalance");
};

var accountBalanceHtmlDisplayed = function () {
    return !!accountBalanceElement();
};

var accountBalanceHtml = function (balance) {
    var balanceFormatted = Number(balance).toLocaleString('en-US', {style: 'currency', currency: 'USD'});
    return '<div class="extensions-AccountBalance">\n' +
        '  <ul class="BudgetOverviewList list-block BudgetOverview-list">\n' +
        '    <li class="BudgetOverviewList-item list-item small ui-content">\n' +
        '      <div class="ui-flex-row">\n' +
        '        <div class="BudgetOverviewList-label ui-flex-column-6" data-text="Balance Needed">Balance Needed</div>\n' +
        '        <div class="BudgetOverviewList-value ui-flex-column-4 ui-flex-column--column text--right" ' +
        '             data-text="' + balanceFormatted + '">' + balanceFormatted + '\n' +
        '        </div>\n' +
        '        <div class="extensions-AccountBalance-refresh ui-flex-column-2 ui-flex-column--column text--right" data-text="Refresh">\n' +
        '          <a class="extensions-AccountBalance-refreshLink"><strong>&#10227;</strong></a>\n' +
        '        </div>\n' +
        '      </div>\n' +
        '    </li>\n' +
        '  </ul>\n' +
        '</div>';
};

var displayBankAccountCalculation = function (balance) {
    var balanceStr = "Bank account balance must be >= $" + balance;

    console.log(balanceStr);

    if (accountBalanceHtmlDisplayed()) {
        accountBalanceElement().outerHTML = accountBalanceHtml(balance)
    } else {
        var sidebar = document.querySelector(".ui-app-budget-details");
        sidebar.insertAdjacentHTML("afterbegin", accountBalanceHtml(balance));
    }

    document.querySelector(".extensions-AccountBalance-refreshLink").addEventListener("click", calculateAndDisplayBalance);
    colorCodeBankAccountBalanceCalculation(balance);
};


var calculateAndDisplayBalance = function () {
    if (!elementExistsOnPage(budgetPageElement)) {
        return;
    }

    var displayedValuesSwitched = false;
    if (!remainingValuesDisplayed()) {
        document.querySelector(".BudgetItemRow-swappableColumn").click();
        displayedValuesSwitched = true;
    }

    var balance = calculateBankBalance();

    displayBankAccountCalculation(balance);

    if (displayedValuesSwitched) {
        document.querySelector(".BudgetItemRow-swappableColumn").click();
    }
};

console.log("Waiting for budget page to load.");
executeAfterElementLoaded(budgetPageElement, function() {
    console.log("Budget page loaded.  Starting Bank Account Calculation.");
    calculateAndDisplayBalance();

    console.log("Will recalculate every minute.");
    setInterval(calculateAndDisplayBalance, 60000);
});
