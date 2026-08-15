


import { createServer } from "http";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const port = 3002;

const DATA_FILE = path.join("data", "links.json");

//// save  links 
const saveLinks = async (links) => {
    await writeFile(DATA_FILE, JSON.stringify(links, null, 2));
};

//load links 
const loadLinks = async () => {
    try {
        const data = await readFile(DATA_FILE, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        if (error.code === "ENOENT") {
            await writeFile(DATA_FILE, JSON.stringify({}, null, 2));
            return {};
        }
        throw error;
    }
};

const server = createServer(async (req, res) => {
    try {

        // Home Page
        if (req.method === "GET" && req.url === "/") {
            const html = await readFile(
                path.join("public", "index.html")
            );

            res.writeHead(200, {
                "Content-Type": "text/html",
            });

            return res.end(html);
        }

        // CSS
        if (req.method === "GET" && req.url === "/index.css") {
            const css = await readFile(
                path.join("public", "index.css")
            );

            res.writeHead(200, {
                "Content-Type": "text/css",
            });

            return res.end(css);
        }

        //// gety all links 
         if (req.method === "GET" && req.url === "/links"){
            const links = await loadLinks();
             res.writeHead(200, {
                "Content-Type": "application/json",
            });
            return res.end(JSON.stringify(links));

        }
        

        // POST /shorten
        if (req.method === "POST" && req.url === "/shorten") {

            let body = "";

            req.on("data", (chunk) => {
                body += chunk;
            });

            req.on("end", async () => {
                try {
                    const links = await loadLinks();

                    console.log("Received Body:", body);

                    const { url, shortCode } = JSON.parse(body);

                    if (!url) {
                        res.writeHead(400, {
                            "Content-Type": "text/plain",
                        });
                        return res.end("URL is required");
                    }

                    const finalShortCode =
                        shortCode || crypto.randomBytes(4).toString("hex");

                    if (links[finalShortCode]) {
                        res.writeHead(400, {
                            "Content-Type": "text/plain",
                        });
                        return res.end("Short code already exists");
                    }

                    links[finalShortCode] = url;

                    await saveLinks(links);

                    res.writeHead(200, {
                        "Content-Type": "application/json",
                    });

                    res.end(
                        JSON.stringify({
                            success: true,
                            shortCode: finalShortCode,
                        })
                    );
                } catch (err) {
                    console.error(err);

                    res.writeHead(500, {
                        "Content-Type": "text/plain",
                    });

                    res.end("Internal Server Error");
                }
            });

            return;
        }
///// delete 
         if (req.method === "DELETE" && req.url.startsWith("/delete/")) {

            const shortCode = decodeURIComponent(req.url.split("/")[2]);

            const links = await loadLinks();

            if (!links[shortCode]) {

                res.writeHead(404, {
                    "Content-Type": "text/plain",
                });

                return res.end("Short code not found");
            }

            delete links[shortCode];

            await saveLinks(links);

            res.writeHead(200, {
                "Content-Type": "text/plain",
            });

            return res.end("Deleted Successfully");
        }

        ///redirect to original url
           if(req.method ==="GET"){
            const shortCode=req.url.slice(1);
            const links=await loadLinks();
            if(links[shortCode]){
                res.writeHead(302,{location: links[shortCode]});
                return res.end();
            }
            res.writeHead(404, {"content-type": "text/plain"});
            return res.end("Short code not found ");
        }
    

         

        // 404
        res.writeHead(404, {
            "Content-Type": "text/plain",
        });

        res.end("404 Route Not Found");

    } catch (err) {
        console.error(err);

        res.writeHead(500, {
            "Content-Type": "text/plain",
        });

        res.end(err.message);
    }
});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});