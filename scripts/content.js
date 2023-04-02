

// GLOBAL SELECTORS!!!
var selector_tab = "select__tab";
var selector_tabs = "select__tabs";
var selector_track = "track";
var selector_tab_active = ["select__tab-active", "active"];


// API ENDPOINTS
var url_mangadex = "https://api.mangadex.org/manga?includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic"
var url_covers = "https://uploads.mangadex.org/covers/"
var url_similar = "https://api.similarmanga.com/similar/"


// DATA FOR TAB DISPLAY
var tab_data = "";
var tab_old = null;
var similar_data_default = '<div class="flex gap-6 items-start"><div role="alert" class="flex items-center rounded justify-center py-4 px-6 mt-2 mb-6 bg-accent"><span class="text-center">No Similar Titles</span></div></div>';
var similar_data = '';

// PARAMETERS
var retries_max = 4;


function on_similar_tab_not_click(e) {

    // remove all highlights, highlight current
    const elements = document.getElementsByClassName(selector_tab);
    for (var i = 0; i < elements.length; i++) {
      elements[i].classList.remove(...selector_tab_active);
    }
    this.classList.add(...selector_tab_active);

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
      elements[i].classList.remove(...selector_tab_active);
    }
    this.classList.add(...selector_tab_active);

    // remove the background overlay
    var track = document.getElementsByClassName(selector_tabs)[0];
    track = track.getElementsByClassName(selector_track)[0];
    track.style.visibility = "hidden"

    // Finally replace with our HTML content!
    if(tab_old == null) {
        var children = document.getElementsByClassName(selector_tabs)[0].parentNode.parentNode.children;
        tab_old = children[children.length - 1];
        tab_data = tab_old.innerHTML;
        tab_old.innerHTML = similar_data;
    }

}

var show_button = true;
function hide_button() {
    show_button = false;
    var elm = document.getElementById("similar_ext_button");
    if(elm != null) {
        elm.style.display = "none";
    }
}


var button_add_tries = 0;
function add_button() {

    // Get the tab list in the document
    const elements = document.getElementsByClassName(selector_tab);
    if (elements) {

        // Get the element of the tab we will clone
        // For some reason this can be null early in the page load
        console.log(elements)
        console.log(elements[0])
        if(elements[0] == null) {
            button_add_tries = button_add_tries + 1;
            if(button_add_tries < retries_max) {
                setTimeout(add_button, 1000);
            }
            return;
        }

        // Callback for all other tabs
        for (var i = 0; i < elements.length; i++) {
            elements[i].addEventListener("click", on_similar_tab_not_click);
        }

        // Create the new button!
        var element_new = elements[0].cloneNode(true)
        element_new.id = "similar_ext_button"
        element_new.text = "Similar"
        element_new.href = "?tab=similar"
        element_new.remove(selector_tab_active);
        element_new.addEventListener("click", on_similar_tab_click);
        element_new.classList.remove(...selector_tab_active);
        var element = elements[0]
        if(show_button) {
            element.parentNode.insertBefore(element_new, element.nextSibling);
        }
    }
}

function populate_similar_tab_page(data) {
    
    // This is the JSON from our response
    console.log(data);
    console.log("got "+data["matches"].length+" similar manga")

    // return if empty
    similar_data = similar_data_default;
    if(data["matches"].length < 1) {
        return;
    }

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
        similar_data += '.manga-card { background-color: var(--md-accent); display: grid; flex-grow: 1; gap: 0.25rem 0.5rem; grid-template-areas: "art title title" "art stats status" "art tags tags" "art description description"; grid-template-columns: min(25%,150px) 1fr auto; grid-template-rows: auto auto auto 1fr; padding: 0.5rem; position: relative; width: 100%; }';
        similar_data += '.description { height: 8.4em; overflow: hidden; position: relative; }';
        similar_data += '.description:after { background: linear-gradient(var(--md-background-transparent),var(--md-accent)); bottom: 0; content: ""; display: block; height: 0.9em; left: 0; position: absolute; width: 100%; }';
        similar_data += '</style>';

        // Else lets create it!
        similar_data += '<div class="follows__content">';
        similar_data += '<div class="grid gap-2 lg:grid-cols-2">';
        for (var i = 0; i < data["matches"].length; i++) {
            try {
                
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
                desc = mmd(desc);

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

            } catch(err) {
                console.log("failed manga " + i + "\n" + err)
            }
        }
        similar_data += '</div>';  
        similar_data += '</div>';  


    }).catch(function (err) {
        console.warn('mangadex api failure...\n' + err);
        hide_button();
    });

}


var retries_current = 0;
var previous_manga = '';
function trigger_url_change() {

    // Return if we can't extract the correct id
    // Also return if we are not on a manga page (e.g. forums)
    var arr_path = window.location.pathname.split('/');
    console.log("path = " + arr_path)
    if(arr_path.length < 3 || (arr_path[1] !== "title" && arr_path[1] !== "manga")) {
        previous_manga = "";
        return;
    }
    if(arr_path[2] == previous_manga) {
        return;
    }
    var mangaid = arr_path[2];
    previous_manga = arr_path[2];
    console.log("got manga id: " + mangaid)

    // Wait till we get the select tabs are rendered
    // https://stackoverflow.com/a/68329632/7718197
    const observer = new MutationObserver(function (mutations, mutationInstance) {
        mutationInstance.disconnect();
        add_button();
    });
    observer.observe(document, {
        childList: true,
        subtree:   true
    });

    // Now send a request to our similar API
    fetch(url_similar+mangaid+".json").then(function (response) {
        return response.json();
    }).then(function (data) {

        // Setup the data page (should load covers)
        populate_similar_tab_page(data);

    }).catch(function (err) {
        console.log('similar manga not found...');
        hide_button();
        // retries_current = retries_current + 1;
        // if(retries_current < retries_max) {
        //     console.log("retrying similar add (" + retries_current + ")");
        //     setTimeout(trigger_url_change, 1000);
        // }
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
      // setTimeout(trigger_url_change, 1000);
      trigger_url_change();
    }
});
const config = {subtree: true, childList: true};
observer.observe(document, config);

// Regular first time page load here.
window.addEventListener('load', function () {
    // setTimeout(trigger_url_change, 1000);
    trigger_url_change();
});

// mmd.js is an itsy bitsy standalone minimalist Markdown parser written in JavaScript.
// https://github.com/p01/mmd.js
// MIT License
// Copyright (c) 2012 Mathieu 'p01' Henri
function mmd(src)
{
	var h='';

	function escape(t)
	{
		return new Option(t).innerHTML;
	}
	function inlineEscape(s)
	{
		return escape(s)
			.replace(/!\[([^\]]*)]\(([^(]+)\)/g, '<img alt="$1" src="$2">')
			.replace(/\[([^\]]+)]\(([^(]+?)\)/g, '$1'.link('$2'))
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(/(\*\*|__)(?=\S)([^\r]*?\S[*_]*)\1/g, '<strong>$2</strong>')
			.replace(/(\*|_)(?=\S)([^\r]*?\S)\1/g, '<em>$2</em>');
	}

	src
	.replace(/^\s+|\r|\s+$/g, '')
	.replace(/\t/g, '    ')
	.split(/\n\n+/)
	.forEach(function(b, f, R)
	{
		f=b[0];
		R=
		{
			// '*':[/\n\* /,'<ul><li>','</li></ul>'],
			// '1':[/\n[1-9]\d*\.? /,'<ol><li>','</li></ol>'],
			// ' ':[/\n    /,'<pre><code>','</code></pre>','\n'],
			// '>':[/\n> /,'<blockquote>','</blockquote>','\n']
		}[f];
		h+=
			R?R[1]+('\n'+b)
				.split(R[0])
				.slice(1)
				.map(R[3]?escape:inlineEscape)
				.join(R[3]||'</li>\n<li>')+R[2]:
			f=='#'?'<h'+(f=b.indexOf(' '))+'>'+inlineEscape(b.slice(f+1))+'</h'+f+'>':
			f=='<'?b:
			'<p>'+inlineEscape(b)+'</p>';
	});
	return h;
};