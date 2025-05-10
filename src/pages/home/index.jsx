import compesaLogo from "/compesaLogo.png";

export const Home = () => {
  return (
    <main className="flex items-center justify-center min-h-screen bg-blue-800">
      <form className="bg-white rounded-3xl shadow-xl p-8 h-[600px] w-full max-w-[500px] flex flex-col items-center gap-4">
        <img
          src={compesaLogo}
          alt="Logo da Compesa"
          className="w-full object-contain mb-2"
        />

        <input
          type="text"
          placeholder="Usuário"
          className="w-full px-4 py-2 border-2 border-blue-800 rounded-md text-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
        />

        <input
          type="password"
          placeholder="Senha"
          className="w-full px-4 py-2 border-2 border-blue-800 rounded-md text-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
        />

        <div className="flex items-center w-full text-sm text-blue-800 justify-center">
          <input
            type="checkbox"
            id="conectado"
            className="accent-blue-800 mr-2"
          />
          <label htmlFor="conectado">Manter-me conectado</label>
        </div>

        <button
          type="submit"
          className="mt-2 w-full bg-blue-700 text-white py-2 rounded-md hover:bg-blue-900 transition"
        >
          Entrar
        </button>
      </form>
    </main>
  );
};
