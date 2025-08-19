const mysql = require("mysql");

module.exports = {
    createProduct: async (pool, productName, productTypeId, price, stock) => {
        try {
            const sql = "INSERT INTO products (product_name, product_type_id, price, stock) VALUES (?, ?, ?, ?)";
            const values = [productName, productTypeId, price, stock];
            const formattedSql = mysql.format(sql, values);
            const result = await pool.query(formattedSql);
            return result;
        } catch (error) {
      console.error("Error in createProduct:", error);
      throw error;
    }
  }
};
