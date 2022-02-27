
const automateBtns = document.querySelectorAll('.automatebtn');

for(let i=0;i<automateBtns.length;i++)
{
    automateBtns[i].addEventListener('click',function(e){
        let element=e.target;
        element.classList.toggle('automated');
        
        if(element.classList.contains('automated'))
        {
            element.innerHTML="Automated";
        }
        else
        {
            element.innerHTML="Automate";
        }

    });
}

var totalBill="";

function addBill(k){
    totalBill =totalBill + k;
}

function returnAutomatedItems(){
    return totalBill;
}