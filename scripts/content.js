

// GLOBAL SELECTORS!!!
var selector_tab = "select__tab";
var selector_tabs = "select__tabs";
var selector_track = "track";
var selector_tab_active = "select__tab-active";


// API ENDPOINTS
var url_mangadex = "https://api.mangadex.org/manga?includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic"
var url_covers = "https://uploads.mangadex.org/covers/"
var url_similar = "https://api.similarmanga.com/similar/"


// DATA FOR TAB DISPLAY
var tab_data = "";
var tab_old = null;
var similar_data_default = '<div class="grid gap-4 mb-12"><div role="alert" class="flex items-center rounded justify-center py-4 px-6 mt-2 mb-6 bg-accent"><span class="text-center">No Similar Titles</span></div></div>';
var similar_data = '';


function on_similar_tab_not_click(e) {

    // remove all highlights, highlight current
    const elements = document.getElementsByClassName(selector_tab);
    for (var i = 0; i < elements.length; i++) {
      elements[i].classList.remove(selector_tab_active);
    }
    this.classList.add(selector_tab_active);

    // show the background overlay
    var track = document.getElementsByClassName(selector_tabs)[0];
    track = track.getElementsByClassName(selector_track)[0];
    track.style.visibility = "visible"

    // if we have tab data we should replace it...
    if(tab_old != null) {
        tab_old.innerHTML = tab_data;
        tab_data = "";
        tab_old = null;
    }

}

function on_similar_tab_click(e) {

    // prevent changing the page
    e.preventDefault();

    // select this last one to be active
    const elements = document.getElementsByClassName(selector_tab);
    for (var i = 0; i < elements.length; i++) {
      elements[i].classList.remove(selector_tab_active);
    }
    this.classList.add(selector_tab_active);

    // remove the background overlay
    var track = document.getElementsByClassName(selector_tabs)[0];
    track = track.getElementsByClassName(selector_track)[0];
    track.style.visibility = "hidden"

    // Finally replace with our HTML content!
    if(tab_old == null) {
        tab_old = document.getElementsByClassName(selector_tabs)[0].parentNode.parentNode.lastChild;
        tab_data = tab_old.innerHTML;
        tab_old.innerHTML = similar_data;
    }

}



function populate_similar_tab_page(data) {
    
    // This is the JSON from our response
    console.log(data);
    console.log("got "+data["matches"].length+" similar manga")

    // return if empty
    similar_data = similar_data_default;
    if(data["matches"].length < 1)
        return;

    // list of ids we need their covers for (max 100, maybe check?)
    var ids = "";
    for (var i = 0; i < data["matches"].length; i++) {
        var manga = data["matches"][i];
        ids += "&ids[]="+manga["id"];
    }

    // Now send a request to our mangadex API to get covers
    // This should also return the details for each manga
    fetch(url_mangadex+ids).then(function (response) {
        return response.json();
    }).then(function (mdata) {

        // return if empty
        if(mdata["data"].length < 1)
            return;

        // create mapping to mangadex data
        var mapping_to_dex = {};
        for (var i = 0; i < mdata["data"].length; i++) {
            mapping_to_dex[mdata["data"][i]["id"]] = mdata["data"][i];
        }

        // This is a custom style for the manga blocks
        // Hopefully this won't break on site updates
        similar_data = '<style>';
        similar_data += '.manga-card { display: grid; position: relative; overflow: hidden; flex-grow: 1; padding: 0.5rem; width: 100%; gap: 0.25rem 0.5rem; grid-template-columns: min(25%,150px) 1fr auto; grid-template-rows: auto auto auto 1fr; grid-template-areas: "art title title" "art stats status" "art tags tags" "art description description"; border-radius: 0.125rem; background-color: var(--md-accent); }';
        similar_data += '</style>';

        // Else lets create it!
        similar_data += '<div class="grid gap-4 mb-12">';
        similar_data += '<div class="grid gap-2 grid-cols-2">';
        for (var i = 0; i < data["matches"].length; i++) {

            // parse the data
            var manga = data["matches"][i];
            var id = manga["id"];
            if(!(id in mapping_to_dex))
                continue;
            var mmanga = mapping_to_dex[id];
            //var title = manga["title"]["en"];
            var title = mmanga["attributes"]["title"]["en"];
            var desc = mmanga["attributes"]["description"]["en"];
            if(title == undefined) 
                title = Object.values(mmanga["attributes"]["title"])[0];
            if(desc == undefined) 
                desc = Object.values(mmanga["description"]["title"])[0];

            // get the cover from the relationships
            var manga_cover = url_covers+"/"+id+"/";
            for (var r = 0; r < mmanga["relationships"].length; r++) {
                if(mmanga["relationships"][r]["type"]=="cover_art") {
                    manga_cover += mmanga["relationships"][r]["attributes"]["fileName"]+".256.jpg"
                }
            }

            // render the html
            similar_data += '<div class="manga-card">';
            similar_data += '<a href="/title/'+id+'" class="font-bold title" style="grid-area: title / title / title / title;">';
            similar_data += '<span>'+title+'</span>';

            similar_data += '<div class="manga-card-cover" style="grid-area: art / art / art / art;"><a href="/title/'+id+'/" class="group flex items-start relative mb-auto cover aspect"><img src="'+manga_cover+'" alt="Cover image" class="rounded shadow-md w-full h-auto" /></a></div>';
            similar_data += '<div class="py-2 description !py-0" style="grid-area: description / description / description / description;"><div class="md-md-container dense">'+desc+'</div></div>';
            
            similar_data += '</a>';
            similar_data += '</div>';  

        }
        similar_data += '</div>';  
        similar_data += '</div>';  


    }).catch(function (err) {
        console.warn('mangadex api failure...');
    });

}



let previous_manga = '';
function trigger_url_change() {

    // Return if we can't extract the correct id
    // Also return if we are not on a manga page (e.g. forums)
    var arr_path = window.location.pathname.split('/');
    if(arr_path.length < 3 || (arr_path[1] !== "title" && arr_path[1] !== "manga"))
        return;
    if(arr_path[2] == previous_manga)
        return;
    var mangaid = arr_path[2];
    previous_manga = arr_path[2];
    console.log("got manga id: " + mangaid)

    // Now send a request to our similar API
    fetch(url_similar+mangaid+".json").then(function (response) {
        return response.json();
    }).then(function (data) {

        // Setup the data page (should load covers)
        populate_similar_tab_page(data);

        // Wait till we get the select tabs are rendered
        // https://stackoverflow.com/a/68329632/7718197
        const observer = new MutationObserver(function (mutations, mutationInstance) {
            const elements = document.getElementsByClassName(selector_tab);
            if (elements) {

                // Callback for all other tabs
                for (var i = 0; i < elements.length; i++) {
                  elements[i].addEventListener("click", on_similar_tab_not_click);
                }

                // Create the tab!
                var element_new = elements[2].cloneNode(true)
                element_new.text = "Similar"
                element_new.href = "?tab=similar"
                element_new.remove(selector_tab_active);
                element_new.addEventListener("click", on_similar_tab_click);
                var element = elements[2]
                element.parentNode.insertBefore(element_new, element.nextSibling);

                // Disable the observer
                mutationInstance.disconnect();
            }
        });
        observer.observe(document, {
            childList: true,
            subtree:   true
        });


    }).catch(function (err) {
        console.warn('similar manga not found...');
    });

}


// Single page app, there is no refresh
// Thus we need to detect if the URL has changed...
// https://stackoverflow.com/a/67825703/7718197
let previous_url = '';
const observer = new MutationObserver(function(mutations) {
  if (location.href !== previous_url) {
      previous_url = location.href;
      console.log(`URL changed to ${location.href}`);
      trigger_url_change();
    }
});
const config = {subtree: true, childList: true};
observer.observe(document, config);

// Regular first time page load here.
window.addEventListener('load', function () {
    trigger_url_change()
});



// // Global database object
// // Only use this once the database has been opened
// var db;

// // How many seconds to cache the api calls
// // We make this 12 hours as descriptions shouldn't change that often
// var max_sec = 86400;


// // This is a nice helper logic which allows rate limits ajax requests
// // This will rate limit requests to a fixed amount so you don't get banned!
// // NOTE: this timeout can change if we are accessing the local database
// // NOTE: no need to rate limit local DB calls, thus current can change
// // https://stackoverflow.com/a/7082586
// // https://stackoverflow.com/a/1280279
// var requests = [];
// var requests_ids = [];
// var standard_timeout_ms = 500;
// var current_timeout_ms = 500;
// function process_callbacks() {

//     // Process the request if needed
//     if(requests.length > 0) {
//         var request = requests.shift();
//         var id = requests_ids.shift();
//         if(typeof request === "function") {
//             request(id);
//         }
//     }

//     // Set callback for the next time we will try
//     window.setTimeout(process_callbacks, current_timeout_ms);

//     // Reset the timeout
//     if(current_timeout_ms != standard_timeout_ms) {
//         current_timeout_ms = standard_timeout_ms;
//     }

// }
// window.setTimeout(process_callbacks, current_timeout_ms);


// // Nice helper function to add commas to our numbers
// // https://stackoverflow.com/a/2901298
// function add_commas(x) {
//     if(x) {
//         return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
//     } else {
//         return x;
//     }
// }


// //========================================================================
// //========================================================================
// //========================================================================


// function init_and_add_similar_tab(objectStoreRequest) {

//     // Record which was the prior tab which has information
//     // This unique id will allow clicking between the two pages without refreshing
//     $("ul.edit.nav.nav-tabs a.nav-link.active:first").attr('id', 'prior_tab')
//     $("ul.edit.nav.nav-tabs a.nav-link.active:first").attr('href', '#')
//     $("div.edit.tab-content").attr('id', 'prior_tab_content')

//     // Add the similar manga tab to the last of the array
//     // This also has a unique ID which has 
//     var html_tab = '<li class="nav-item">';
//     html_tab += '<a class="nav-link" href="#" id="similar_tab">';
//     html_tab += '<span class="fas fa-chart-bar fa-fw " aria-hidden="true"></span> ';
//     html_tab += '<span class="d-none d-md-inline">Similar';
//     if(objectStoreRequest.result && objectStoreRequest.result['m_ids'] && objectStoreRequest.result['m_titles']) {
//         html_tab += ' ('+objectStoreRequest.result['m_ids'].length+' found)';
//     }
//     html_tab += '</span></a></li>';
//     $("ul.edit.nav.nav-tabs").append(html_tab)

//     // Append the similar manga tab
//     var html_content = '<div class="edit tab-content" id="similar_tab_content" style="display:none;">';

//     // Check if we have a response, if so then display the mangas
//     // Else just give an empty page with a warning
//     if(objectStoreRequest.result && objectStoreRequest.result['m_ids'] && objectStoreRequest.result['m_titles']) {

//         // Add information about  what this tab does
//         html_content += '<div class="alert alert-info mt-4 mb-4 mr-5 ml-5 text-center" role="alert">';
//         html_content += '<strong>Notice:</strong> This is a feature where one can get similar manga recommendations. ';
//         html_content += 'This is a recommendation system outside of MangaDex, and works by matching by genres, ';
//         html_content += 'demographics, content type, themes, and then using term frequency–inverse document ';
//         html_content += ' frequency (tf–idf) to get the similarity of two manga\'s descriptions.';
//         html_content += '</div>';

//         // Loop through and append manga entries
//         html_content += '<div class="row mt-1 mx-0">';
//         var m_ids = objectStoreRequest.result['m_ids'];
//         var m_titles = objectStoreRequest.result['m_titles'];
//         for (var i=0; i < m_ids.length; i++) {

//             var id = m_ids[i];
//             var title = m_titles[i];
//             var seconds = new Date().getTime() / 1000;

//             html_content += '<div class="manga-entry col-lg-6 border-bottom pl-0 my-1" data-id="'+id+'">';

//             // Logo
//             html_content += '<div class="rounded large_logo mr-2">';
//             html_content += '<a href="/title/'+id+'/"><img class="rounded" src="/images/manga/'+id+'.large.jpg?'+seconds+'" width="100%" alt="image"></a>';
//             html_content += '</div>';

//             // Title
//             html_content += '<div class="text-truncate mb-1 d-flex flex-nowrap align-items-center">';
//             html_content += '<a class="ml-1 manga_title text-truncate" title="'+title+'" href="/title/'+id+'/">'+title+'</a>';
//             html_content += '</div>';

//             // Description
//             html_content += '<div style="height: 210px; overflow: hidden;">Loading....</div>'
//             html_content += '</div>';

//             // Append the request to get the latest description and information
//             requests_ids.push(id);
//             requests.push(update_manga_from_api);

//         }
//         html_content += '</div>';


//     } else {

//         // Notice that we don't have anything
//         html_content += '<div class="alert alert-info mt-4 mb-4 text-center" role="alert">';
//         html_content += '<strong>Notice:</strong> There are no similar manga found...';
//         html_content += '</div>';

//     }

//     // Download the latest database file
//     html_content += '<div class="text-center mt-4">';
//     html_content += '<a role="button" class="btn btn-secondary" href="#" id="similar_database_update">';
//     html_content += '<span class="fas fa-cloud-download-alt fa-fw" aria-hidden="true"></span> Update Similar Database';
//     html_content += '</a></div>';

//     // Finally actually append this tab
//     $("#prior_tab_content").after(html_content);


//     // Subscriber to change the content panel
//     $("#similar_tab").click(function(e) {
//         e.preventDefault();
//         // prior
//         $("#prior_tab_content").hide();
//         $("#prior_tab").removeClass('active');
//         // similar
//         $("#similar_tab_content").show();
//         $("#similar_tab").addClass('active');
//         window.location.hash = "similar"
//         return false;
//     });

//     // If user url has similar in it, then change to that tab
//     if (window.location.href.indexOf("#similar") > -1) {
//         // prior
//         $("#prior_tab_content").hide();
//         $("#prior_tab").removeClass('active');
//         // similar
//         $("#similar_tab_content").show();
//         $("#similar_tab").addClass('active');
//     }

//     // Subscriber to change the content panel
//     $("#prior_tab").click(function(e) {
//         e.preventDefault();
//         // prior
//         $("#prior_tab_content").show();
//         $("#prior_tab").addClass('active');
//         // similar
//         $("#similar_tab_content").hide();
//         $("#similar_tab").removeClass('active');
//         window.location.hash = "prior"
//         return false;
//     });

//     // Subscriber to update the database
//     $("#similar_database_update").click(function(e) {
//         e.preventDefault();
//         $("#similar_database_update").html('<span class="fas fa-cloud-download-alt fa-fw" aria-hidden="true"></span> Pulling, Do NOT Refresh!');
//         get_latest_database();
//         return false;
//     });


// }

// //========================================================================
// //========================================================================
// //========================================================================


// function process_data_update_html(data, url) {

//     // Check that we have all properties needed
//     if (!data.hasOwnProperty("manga") ||
//         !data["manga"].hasOwnProperty("cover_url") ||
//         !data["manga"].hasOwnProperty("lang_flag") ||
//         !data["manga"].hasOwnProperty("title") ||
//         !data["manga"].hasOwnProperty("rating") ||
//         !data["manga"]["rating"].hasOwnProperty("users") ||
//         !data["manga"]["rating"].hasOwnProperty("bayesian") ||
//         !data["manga"].hasOwnProperty("follows") ||
//         !data["manga"].hasOwnProperty("comments") ||
//         !data["manga"].hasOwnProperty("description") ||
//         url.split('/').length < 4) {
//         return false;
//     }

//     // Extract the manga id
//     var id = url.split('/')[3];

//     // Logo
//     html_content = '<div class="rounded large_logo mr-2">';
//     html_content += '<a href="/title/'+id+'/"><img class="rounded" src="'+data["manga"]["cover_url"]+'" width="100%" alt="image"></a>';
//     html_content += '</div>';

//     // Title
//     html_content += '<div class="text-truncate mb-1 d-flex flex-nowrap align-items-center">';
//     html_content += '<div><span class="rounded flag flag-'+data["manga"]["lang_flag"]+'" title="'+data["manga"]["lang_name"]+'"></span></div>';
//     html_content += '<a class="ml-1 manga_title text-truncate" title="'+data["manga"]["title"]+'" href="/title/'+id+'/">'+data["manga"]["title"]+'</a>';
//     html_content += '</div>';

//     // Rating
//     html_content += '<ul class="list-inline m-1">';
//     html_content += '<li class="list-inline-item text-primary">';
//     html_content += '<span class="fas fa-star fa-fw " aria-hidden="true" title="Bayesian rating"></span>';
//     html_content += '(<span title="'+data["manga"]["rating"]["users"]+' votes">'+data["manga"]["rating"]["bayesian"]+'</span>)';
//     html_content += '</li>';
//     // Follows
//     html_content += '<li class="list-inline-item text-success">';
//     html_content += '<span class="fas fa-bookmark fa-fw " aria-hidden="true" title="Follows"></span> '+add_commas(data["manga"]["follows"]);
//     html_content += '</li>';

//     // Views
//     html_content += '<li class="list-inline-item text-info">';
//     html_content += '<span class="fas fa-eye fa-fw " aria-hidden="true" title="Views"></span> '+add_commas(data["manga"]["views"]);
//     html_content += '</li>';

//     // Comments
//     var title_for_url = data["manga"]["title"].toLowerCase().replace(/ /g, '-');
//     html_content += '<li class="list-inline-item">';
//     html_content += '<a href="/manga/'+id+'/'+title_for_url+'/comments"><span class="badge badge-secondary" title="'+add_commas(data["manga"]["comments"])+' comments">';
//     html_content += '<span class="far fa-comments fa-fw " aria-hidden="true"></span> '+add_commas(data["manga"]["comments"])+'</span>';
//     html_content += '</a></li>';
//     html_content += '</ul>';

//     // Description
//     var description = data["manga"]["description"];
//     description = description.replace(/(\[hr\])/g, "[hr][/hr]");
//     description = description.replace(/(\[\*\])/g, "&bull; ");
//     description = description.replace(/(\r\n|\n|\r)/gm, "\n");;
//     var result = XBBCODE.process({
//         text: description,
//         removeMisalignedTags: false,
//         addInLineBreaks: true
//     });
//     html_content += '<div style="height: 210px; overflow: hidden;">'+result.html+'</div>';
//     html_content += '</div>';

//     // Finally replace the original content
//     $('div[data-id="'+id+'"]').html(html_content);
//     return true;


// }



// //========================================================================
// //========================================================================
// //========================================================================



// function update_manga_from_api(local_id) {


//     // Try to query the current database
//     var transaction = db.transaction(["api"], "readonly");
//     var objectStore = transaction.objectStore("api");
//     var objectStoreRequest = objectStore.get(local_id);

//     // Success callback
//     objectStoreRequest.onsuccess = function(event) {

//         // If we have the object, then check if we should still do the AJAX
//         // If more then max time has passed, then query anyway
//         var currentTime = (new Date().getTime()) / 1000;
//         if(!objectStoreRequest.result ||
//             !objectStoreRequest.result['date_updated'] ||
//             !objectStoreRequest.result['api_data'] ||
//             (currentTime-objectStoreRequest.result['date_updated']) > max_sec) {
//             $.ajax({
//                 type: "GET",
//                 url: "/api/manga/"+local_id+"/",
//                 xhrFields: {
//                     withCredentials: true
//                 },
//                 crossDomain: true,
//                 timeout: 1000,
//                 success: function(data, status, xhr) {
//                     var success = process_data_update_html(data, this.url);
//                     // Insert into the database for future runs
//                     if(success) {
//                         var item = {
//                             id: local_id,
//                             date_updated: currentTime,
//                             api_data: {"manga":data["manga"]}
//                         };
//                         var transaction = db.transaction(["api"], "readwrite");  
//                         var objectStore = transaction.objectStore("api");
//                         var request = objectStore.put(item);
//                         // On success, we will update the tab with the percent complete
//                         request.onsuccess = function(event) {
//                             console.log("successfully inserted api "+local_id+" call into db");
//                         }
//                     }
//                 }
//             });

//         } else {
//             console.log("read api "+local_id+" from db");
//             current_timeout_ms = 0;
//             var url = "/api/manga/"+local_id+"/"
//             process_data_update_html(objectStoreRequest.result['api_data'], url);
//         }

//     };


// }



// //========================================================================
// //========================================================================
// //========================================================================


// function get_latest_database() {

//     // Json file that we want to insert
//     var database_url = "https://raw.githubusercontent.com/goldbattle/MangadexRecomendations/master/output/mangas_compressed.json"
//     console.log("downloading: \n"+database_url)

//     // Create the AJAX call and its callback
//     $.ajax({
//         url: database_url,
//         type: 'GET',
//         dataType: "json",
//         success: function(data, status, xhr) {

//             // Get last modified date
//             var date = xhr.getResponseHeader("Expires")
//             console.log("data expires: "+date);

//             // Clear the old database entries
//             var transaction = db.transaction(["manga"], "readwrite");  
//             var objectStore = transaction.objectStore("manga");
//             var request = objectStore.clear();

//             // On success, we will insert into the database
//             request.onsuccess = function(event) {
//                 // Loop through and insert the updated database
//                 var count = 0;
//                 var total = Object.keys(data).length;
//                 for (var key in data) {

//                     // Check that the json has all the properties we have
//                     if (!data.hasOwnProperty(key) ||
//                         !data[key].hasOwnProperty("m_ids") ||
//                         !data[key].hasOwnProperty("m_titles")) {
//                         continue;
//                     }

//                     // Create the transaction to insert into the database
//                     var item = {
//                         id: key,
//                         m_ids: data[key]["m_ids"],
//                         m_titles: data[key]["m_titles"]
//                     };
//                     var transaction = db.transaction(["manga"], "readwrite");  
//                     var objectStore = transaction.objectStore("manga");
//                     var request = objectStore.put(item);

//                     // On success, we will update the tab with the percent complete
//                     request.onsuccess = function(event) {

//                         // Move forward in time since this succeeded
//                         count = count + 1;
//                         console.log("inserting "+key+" ("+count+" of "+total+")");

//                         // Update similar tab title with the percent complete
//                         var html_tab = '<span class="fas fa-chart-bar fa-fw " aria-hidden="true"></span> ';
//                         html_tab += '<span class="d-none d-md-inline">Similar ('+count+' / '+total+')</span>';
//                         $("#similar_tab").html(html_tab);

//                         // Reload if completed
//                         if(count == total) {
//                             location.reload();
//                         }

//                     };
//                 }
//             };
//         }
//     });
// }




