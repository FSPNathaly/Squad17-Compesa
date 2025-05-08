import compesaLogo from "/compesaLogo.png";

export const Home = () => {
  return (
    <main className="flex items-center justify-center h-screen bg-azul">
      <form action="" className="bg-white rounded-4xl flex flex-col items-center">
        <img src={compesaLogo} className="w-[500px]" />
        <input type="text" placeholder="Login" className="rounded-[9px] border-[2px] border-azul w-2xs text-azul" />
        <input type="text" placeholder="Senha" className="rounded-[9px] border-[2px] border-azul w-2xs  text-azul"/>
        <div>
          <input type="checkbox" id="conectado" />{" "}
          <label htmlFor="conectado">Manter-me conectado</label>
        </div>
        <button>Entrar</button>
      </form>
    </main>
  );
};
