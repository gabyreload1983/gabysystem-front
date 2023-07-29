import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ProductsInOrder from "./ProductsInOrder";
import { UserContext } from "../../../context/userContext";
import { useNavigate } from "react-router-dom";
import {
  SwalError,
  SwalSuccess,
  SwalToast,
  SwalWaiting,
  getFromApi,
  getTotalOrder,
  putToApi,
} from "../../../utils";
import Swal from "sweetalert2";
import {
  formatSerialNumber,
  getOrderDiagnosis,
  getOrderState,
  getOrderTier,
  getOrderTierBackground,
  getOrderUbication,
} from "../orderUtils";
import moment from "moment/moment";
import AddingProduct from "./AddingProduct";

export default function OrderDetail() {
  const { user, logoutUserContext } = useContext(UserContext);
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [cancelButton, setCancelButton] = useState(true);
  const [confirmButton, setConfirmButton] = useState(true);

  const navigate = useNavigate();

  const goBack = () => {
    navigate(-1);
  };

  const getOrder = async () => {
    const response = await getFromApi(
      `http://${import.meta.env.VITE_URL_HOST}/api/orders/${id}`
    );
    if (response.status === "error" && response.message === "jwt-expired") {
      await SwalError(response);
      logoutUserContext();
      return navigate("/login");
    }
    if (response.status === "error") return await SwalError(response);

    if (response.status === "success") return setOrder(response.payload);
  };

  const handleAddingProduct = async (product) => {
    let serie = "";
    if (product.trabaserie === "S") {
      let { value } = await Swal.fire({
        input: "text",
        inputLabel: "Ingrese Nº Serie",
        inputPlaceholder: "Numero de Serie",
        showCancelButton: true,
      });

      if (!value) {
        return;
      }

      value = formatSerialNumber(value);

      const response = await getFromApi(
        `http://${import.meta.env.VITE_URL_HOST}/api/products/serie/${value}`
      );
      if (response.status === "error" && response.message === "jwt-expired") {
        await SwalError(response);
        logoutUserContext();
        return navigate("/login");
      }
      if (response.status === "error") return await SwalError(response);

      if (response.status === "success") {
        if (response.payload.length) {
          const productFind = response.payload[0];
          if (product.codigo !== productFind.codigo)
            return await SwalError({
              message: `El serie pertenece al producto ${productFind.codigo}`,
            });
        }
      }
      serie = value;
    }
    product.serie = serie;
    order.products.push(product);
    order.total = getTotalOrder(order);

    setOrder((prev) => ({
      ...prev,
      products: order.products,
      total: order.total,
    }));

    setCancelButton(false);
    setConfirmButton(false);
  };

  const handleDeletingProduct = (product) => {
    // check serie
    const index = order.products.findIndex(
      (p) => p.codigo === product.codigo && p.serie === product.serie
    );
    order.products.splice(index, 1);
    order.total = getTotalOrder(order);

    setOrder((prev) => ({
      ...prev,
      products: order.products,
      total: order.total,
    }));

    setCancelButton(false);
    setConfirmButton(false);
  };

  const handleConfirm = async () => {
    try {
      const question = await Swal.fire({
        text: `Guardar cambios en orden ${order.nrocompro}?`,
        showCancelButton: true,
        confirmButtonText: "Aceptar",
      });
      if (!question.isConfirmed) return;

      SwalWaiting("Actualizando orden y enviando email");

      const response = await putToApi(
        `http://${import.meta.env.VITE_URL_HOST}/api/orders/products`,
        order
      );

      if (response.status === "error" && response.message === "jwt-expired") {
        await SwalError(response);
        logoutUserContext();
        return navigate("/login");
      }
      if (response.status === "error") return await SwalError(response);

      if (response.status === "success") {
        setCancelButton(true);
        setConfirmButton(true);
        getOrder();
        if (!order.products.length) {
          return SwalSuccess(
            "Cambios guardados con exito! Orden sin productos"
          );
        }

        await Swal.fire({
          icon: "success",
          text: `Cambios guardados con exito!`,
          position: "center",
          showConfirmButton: true,
          confirmButtonText: "Abrir PDF",
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: (toast) => {
            toast.addEventListener("mouseenter", Swal.stopTimer);
            toast.addEventListener("mouseleave", Swal.resumeTimer);
          },
        });

        window.open(
          `http://${import.meta.env.VITE_URL_HOST}/pdfHistory/${
            response.payload.fileName
          }`,
          "_blank"
        );
      }
      if (response.status === "error") {
        SwalError(response);
      }
    } catch (error) {
      SwalError(error);
    }
  };

  const handleCancel = async () => {
    try {
      const question = await Swal.fire({
        text: `Cancelar cambios en orden ${order.nrocompro}?`,
        showCancelButton: true,
        confirmButtonText: "Aceptar",
      });
      if (!question.isConfirmed) return;

      getOrder();
      setCancelButton(true);
      setConfirmButton(true);
    } catch (error) {
      SwalError(error);
    }
  };

  const outOrder = async (id) => {
    try {
      const question = await Swal.fire({
        text: `Queres dar salida a la orden ${order.nrocompro}?`,
        showCancelButton: true,
        confirmButtonText: "Aceptar",
      });
      if (!question.isConfirmed) return;

      const response = await putToApi(
        `http://${import.meta.env.VITE_URL_HOST}/api/orders/out/${id}`
      );

      if (response.status === "error" && response.message === "jwt-expired") {
        await SwalError(response);
        logoutUserContext();
        return navigate("/login");
      }
      if (response.status === "error") return await SwalError(response);

      if (response.status === "success") {
        getOrder();
        SwalToast("Salida de orden exitosa!");
      }
    } catch (error) {
      SwalError(error);
    }
  };

  useEffect(() => {
    getOrder();
  }, [id]);

  return (
    <>
      {order && (
        <div className="container my-3">
          <button className="btn btn-outline-secondary" onClick={goBack}>
            volver
          </button>

          <h2>
            {order.nombre} - {order.nrocompro}
          </h2>

          <div className="row">
            <div className="col-12 col-md-6">
              <table className="table">
                <tbody>
                  <tr>
                    <td>ESTADO</td>
                    <td>{getOrderState(order.estado)}</td>
                  </tr>
                  <tr>
                    <td>DIAGNOSTICO</td>
                    <td>{getOrderDiagnosis(order.diag)}</td>
                  </tr>
                  <tr>
                    <td>UBICACION</td>
                    <td>{getOrderUbication(order.ubicacion)}</td>
                  </tr>
                  <tr>
                    <td>FECHA INGRESO</td>
                    <td>
                      {moment(order.ingresado).format("DD/MM/YYYY hh:mm a")}
                    </td>
                  </tr>
                  <tr>
                    <td>PRIORIDAD</td>
                    <td className={getOrderTierBackground(order.prioridad)}>
                      {getOrderTier(order.prioridad)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="col-12 col-md-6">
              <table className="table">
                <tbody>
                  <tr>
                    <td>TELEFONO</td>
                    <td>{order.telefono}</td>
                  </tr>
                  <tr>
                    <td>ARTICULO</td>
                    <td>{order.descart}</td>
                  </tr>
                  <tr>
                    <td>ACCESORIOS</td>
                    <td>{order.accesorios}</td>
                  </tr>
                  <tr>
                    <td>VENDEDOR</td>
                    <td>{order.operador}</td>
                  </tr>
                  <tr>
                    <td>TECNICO</td>
                    <td>{order.tecnico}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="col-12">
              <table className="table">
                <tbody>
                  <tr>
                    <td>
                      FALLA: <span>{order.falla}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="col-12">
              <table className="table">
                <tbody>
                  <tr>
                    <td>
                      <div className="mb-3">
                        <label className="form-label">Diagnostico</label>
                        <textarea
                          value={order.diagnostico}
                          readOnly
                          className="form-control"
                          rows="3"
                          disabled
                        ></textarea>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="row">
            <div className="col-12">
              <h3>DETALLE</h3>
              <ProductsInOrder
                products={order.products}
                price={order.costo}
                total={order.total}
                onDeletingProduct={handleDeletingProduct}
                state={order.estado}
              />
            </div>
            {order.estado === 22 && (
              <div className="col-12 d-flex justify-content-between mb-3">
                <div className="btn-group">
                  <button
                    className="btn btn-sm btn-outline-success"
                    onClick={handleConfirm}
                    disabled={confirmButton}
                  >
                    Confirmar
                  </button>

                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={handleCancel}
                    disabled={cancelButton}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="row">
            <div className="col text-end">
              {order.estado === 23 && order.ubicacion === 21 && (
                <button
                  className="btn btn-danger"
                  onClick={() => outOrder(order.nrocompro)}
                >
                  Salida
                </button>
              )}
            </div>
          </div>
          <div className="row">
            <div className="col">
              {order.estado === 22 && (
                <AddingProduct onAddingProduct={handleAddingProduct} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}