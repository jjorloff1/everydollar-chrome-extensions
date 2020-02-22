// var sum = 0.00;
// var allValues = document.querySelectorAll(".money--remaining");
// allValues.forEach(function (item) {
//     var value = item.dataset.text.replace('$', '').replace(',', '');
//     sum += parseFloat(value) * 100;
//     console.log(value);
// });
// var balance = (sum - 1500000)/100;
// var balanceStr = "Back account balance must be >= $" + balance
//
// console.log(balanceStr);
// alert(balanceStr);





// var executeFunctionOnElementChange = function (targetNode, functionToExecute) {
//     // Options for the observer (which mutations to observe)
//     const config = {attributes: true, childList: true, subtree: true};
//
//     // Callback function to execute when mutations are observed
//     const callback = function (mutationsList, observer) {
//         mutationTypes = mutationsList.map((mutation) => {
//             return mutation.type;
//         });
//
//         console.log("Mutations: " + mutationTypes);
//
//         // functionToExecute();
//     };
//
//     // Create an observer instance linked to the callback function
//     const observer = new MutationObserver(callback);
//
//     // Start observing the target node for configured mutations
//     observer.observe(targetNode, config);
// };



// var setupSwappableColumnChangeListener = function() {
//     swappableColumnElements().forEach(function () {
//         executeFunctionOnElementChange(budgetPageElement(), calculateAndDisplayBalance);
//     });
// };