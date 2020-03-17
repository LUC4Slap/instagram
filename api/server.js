const expres = require("express");
const bodyParser = require("body-parser");
const mongoDb = require("mongodb");
const objectId = require("mongodb").ObjectID;
const multiparty = require("connect-multiparty");
const fs = require("fs");

let app = expres();

// body-parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(multiparty());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POT, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

let porta = 8080;

app.listen(porta);

let db = new mongoDb.Db(
  "instagram",
  new mongoDb.Server("localhost", 27017, {}),
  {}
);

console.log("Servidor ON");

app.get("/", (req, res) => {
  res.send({ msg: "Olá, mundo" });
});

// POST para salvar uma postagem
app.post("/api", (req, res) => {
  let date = new Date();
  let time_stamp = date.getTime();

  let url_imagem = time_stamp + "_" + req.files.arquivo.originalFilename;

  let path_origem = req.files.arquivo.path;
  let path_destino = "./uploads/" + url_imagem;

  fs.rename(path_origem, path_destino, function(err) {
    if (err) {
      res.status(500).json({ erro: err });
      return;
    }
    let dados = {
      url_imagem: url_imagem,
      titulo: req.body.titulo
    };
    db.open(function(err, mongoClient) {
      mongoClient.collection("postagens", function(err, collection) {
        collection.insert(dados, function(err, records) {
          if (err) {
            res.json({ status: "erro" });
          } else {
            res.json({ status: "inclusão realizada com sucesso!" });
            // res.json(records);
          }
          mongoClient.close();
        });
      });
    });
  });
});

// GET para recuperar as postagens
app.get("/api", (req, res) => {
  db.open(function(err, mongoClient) {
    mongoClient.collection("postagens", function(err, collection) {
      collection.find().toArray(function(err, result) {
        if (err) {
          res.json(err);
        } else {
          res.json(result);
        }
        mongoClient.close();
      });
    });
  });
});

// GET para recuperar as postagens com um ID passado ( GET by ID )
app.get("/api/:id", (req, res) => {
  db.open(function(err, mongoClient) {
    mongoClient.collection("postagens", function(err, collection) {
      collection.find(objectId(req.params.id)).toArray(function(err, result) {
        if (err) {
          res.json(err);
        } else {
          res.status(200).json(result);
        }
        mongoClient.close();
      });
    });
  });
});

// PEGAR IMAGENS DA PASTA UPLOADS
app.get("/imagens/:imagem", (req, res) => {
  let img = req.params.imagem;
  fs.readFile("./uploads/" + img, (err, content) => {
    if (err) {
      res.status(400).json({ erro: err });
      return;
    }
    res.writeHead(200, { "content-type": "image/jpg" });
    res.end(content);
  });
});

// PUT para atualizar um registro! (update)
app.put("/api/:id", function(req, res) {
  db.open(function(err, mongoClient) {
    mongoClient.collection("postagens", function(err, collection) {
      collection.update(
        { _id: objectId(req.params.id) },
        {
          $push: {
            comentarios: {
              id_comentario: new objectId(),
              comentario: req.body.comentario
            }
          }
        },
        {},
        function(err, records) {
          if (err) {
            res.json(err);
          } else {
            res.json(records);
          }
          mongoClient.close();
        }
      );
    });
  });
});

// DELETE por ID (REMOVER UM DOCUMENTO)
app.delete("/api/:id", (req, res) => {
  db.open(function(err, mongoClient) {
    mongoClient.collection("postagens", function(err, collection) {
      collection.update(
        {  },
        { $pull : {
          comentarios: { id_comentario : objectId(req.params.id) }
        }},
        { multi: true },
        function(err, records) {
          if (err) {
            res.json(err);
          } else {
            res.json(records);
          }
          mongoClient.close();
      });
    });
  });
});
