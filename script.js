document.addEventListener("DOMContentLoader",function(){

        /* post*/

    const postform=document.querySelector(".form-container form");
    if(postform){
        postform.addEventListener("submit",function(e){
            e.preventDefault();
           const input= postform.querySelectorAll("input,select,textarea");
             let filled=true;
                    input.forEach(input =>{
                       if (input.hasAttribute("required")&&input.value.trim()===""){
                         filled=false;
                   }
             });
                    if(!filled){
                         alert("⚠ please fill all required fields!");
                         return;
                    }
                    alert(" ✅Waste reques submitted successfully!");
                     postform.reset();

        });
    }
   


    /*login*/
    const logform=document.querySelector(".form-box form");
    if(logform){
        logform.addEventListener("submit",function(e){
            e.preventDefault();
            alert("Login successful");
        });
    }




   /*regeister*/
   const form=document.querySelectorAll(".form-box form");
   if(form.length>1){
    form[1].addEventListener("submit", function(e){
        e.preventDefault();
        alert("Registered successfully");

    });
   }
 


   /*job*/

const jobsbutton=document.querySelectorAll(".job-card button");
    jobsbutton.forEach(btn=>{
    btn.addEventListener("click",function(e){
        alert("Application sent to client!");
    });
});



/*product*/
const buybutton=document.querySelectorAll(".product-card button")
buybutton.forEach(btn=>{
    btn.addEventListener("click",function(e){
        alert("Product added to cart ");
    });

});


});

